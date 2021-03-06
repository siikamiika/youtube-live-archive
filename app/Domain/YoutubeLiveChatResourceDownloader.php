<?php

namespace App\Domain;

class YoutubeLiveChatResourceDownloader
{
    private $video;
    private $file;
    private $emojiDirectory;
    private $sponsorBadgeDirectory;
    private $stickerDirectory;
    private $authorPhotoDirectory;

    public function __construct($video)
    {
        $this->video = $video;
    }

    public function openLiveChat(): bool
    {
        $videoFile = $this->video->files()->where('type', 'live_chat')->first();
        if (!$videoFile) {
            return false;
        }
        $this->file = fopen($videoFile->getPath($this->video), 'r');
        return true;
    }

    private function ensureDirectories()
    {
        $this->emojiDirectory = storage_path('app/public/images/live_chat_emoji/' . $this->video->channel->id . '/');
        if (!file_exists($this->emojiDirectory)) {
            mkdir($this->emojiDirectory, 0755, true);
        }

        $this->sponsorBadgeDirectory = storage_path('app/public/images/live_chat_sponsor_badges/' . $this->video->channel->id . '/');
        if (!file_exists($this->sponsorBadgeDirectory)) {
            mkdir($this->sponsorBadgeDirectory, 0755, true);
        }

        $this->stickerDirectory = storage_path('app/public/images/stickers/');
        if (!file_exists($this->stickerDirectory)) {
            mkdir($this->stickerDirectory, 0755, true);
        }

        $this->authorPhotoDirectory = storage_path('app/public/images/author_photos/');
        if (!file_exists($this->authorPhotoDirectory)) {
            mkdir($this->authorPhotoDirectory, 0755, true);
        }
    }

    public function downloadChatResources()
    {
        $this->ensureDirectories();

        while ($line = stream_get_line($this->file, 0x100000, "\n")) {
            $action = json_decode($line, true);
            $actions = $action['replayChatItemAction']['actions'] ?? null;
            if (!$actions) { continue; }
            $item = null;
            foreach ($actions as $action2) {
                $item = $action2['addChatItemAction']['item']
                    ?? $action2['addBannerToLiveChatCommand']['bannerRenderer']['liveChatBannerRenderer']['contents']
                    ?? null;
                if ($item) { break; }
            }
            if (!$item) { continue; }

            $renderer = $item['liveChatTextMessageRenderer']
                ?? $item['liveChatPaidMessageRenderer']
                ?? $item['liveChatMembershipItemRenderer']
                ?? $item['liveChatPaidStickerRenderer']
                ?? null;
            if (!$renderer) { continue; }

            if (array_key_exists('message', $renderer)) {
                $this->downloadEmoji($renderer['message']['runs']);
            }
            if (array_key_exists('authorBadges', $renderer)) {
                $this->downloadSponsorBadges($renderer['authorBadges']);
            }
            if (array_key_exists('sticker', $renderer)) {
                $this->downloadStickers($renderer['sticker']['thumbnails']);
            }
            if (array_key_exists('authorPhoto', $renderer)) {
                $this->downloadAuthorPhotos($renderer['authorPhoto']['thumbnails'], $renderer['authorExternalChannelId']);
            }
            if (array_key_exists('sponsorPhoto', $renderer)) {
                $this->downloadAuthorPhotos($renderer['sponsorPhoto']['thumbnails'], $renderer['authorExternalChannelId']);
            }
        }
    }

    private function downloadEmoji(array $runs)
    {
        foreach ($runs as $run) {
            if (!array_key_exists('emoji', $run)) { continue; }
            $emoji = $run['emoji'];
            [$channelId, $emojiId] = explode('/', $emoji['emojiId']);
            if (file_exists($this->emojiDirectory . $emojiId . '.png')) { continue; }
            $emojiImage = null;
            foreach ($emoji['image']['thumbnails'] as $image) {
                if (!$emojiImage || $image['width'] > $emojiImage['width']) {
                    $emojiImage = $image;
                }
            }
            $imagePath = (new Curl($emojiImage['url']))->downloadFile($this->emojiDirectory . $emojiId, ['image/png', 'image/jpeg']);
            $this->convertImage($imagePath, 'png');
        }
    }

    private function downloadSponsorBadges(array $badges)
    {
        foreach ($badges as $badge) {
            $badgeRenderer = $badge['liveChatAuthorBadgeRenderer'];
            if (!array_key_exists('customThumbnail', $badgeRenderer)) { continue; }

            $duration = null;
            $newMemberPatterns = [
                '/New member/',
                '/新規メンバー/',
            ];

            foreach ($newMemberPatterns as $re) {
                if (preg_match($re, $badgeRenderer['tooltip'])) {
                    $duration = 0;
                    break;
                }
            }
            if ($duration === null) {
                $memberBadgePatterns = [
                    '/Member \((?:(?:(\d+) years?\, (\d+) months?)|(?:(\d+) years?)|(?:(\d+) months?))\)/',
                    '/メンバー（(?:(?:(\d+) 年 (\d+) か月)|(?:(\d+) 年)|(?:(\d+) か月))）/', // TODO over １ 年, how is it actually formatted?
                ];
                $matched = false;
                foreach ($memberBadgePatterns as $re) {
                    $matched = preg_match($re, $badgeRenderer['tooltip'], $matches);
                    if ($matched) { break; }
                }
                if (!$matched) {
                    throw new \RuntimeException('Cannot parse member badge duration');
                }

                if ($matches[1]) {
                    $duration = 12 * $matches[1] + 1 * $matches[2];;
                } else if ($matches[3]) {
                    $duration = 12 * $matches[3];
                } else if ($matches[4]) {
                    $duration = 1 * $matches[4];
                }
            }

            $durationMilestone = null;
            foreach ([24, 12, 6, 2, 1, 0] as $d) {
                if ($d <= $duration) {
                    $durationMilestone = $d;
                    break;
                }
            }
            if ($durationMilestone === null || file_exists($this->sponsorBadgeDirectory . $durationMilestone . '.png')) { continue; }

            $badgeThumbnail = end($badgeRenderer['customThumbnail']['thumbnails']);
            if (!$badgeThumbnail) { continue; }

            $imagePath = (new Curl($badgeThumbnail['url']))->downloadFile($this->sponsorBadgeDirectory . $durationMilestone, ['image/png', 'image/jpeg', 'image/gif']);
            $this->convertImage($imagePath, 'png');
        }
    }

    private function downloadStickers(array $stickers)
    {
        $chosenUrl = $this->chooseThumbnailUrl($stickers);
        if (!preg_match('/^(?:https?:)?\/\/(.*)/', $chosenUrl, $matches)) {
            throw new \RuntimeException('Cannot parse sticker url');
        }

        $url = 'https://' . $matches[1];
        $dirName = $this->encodeBase64Url($matches[1]);

        if (file_exists($this->stickerDirectory . $dirName)) {
            return;
        }
        mkdir($this->stickerDirectory . $dirName, 0755, true);

        $filename = $this->stickerDirectory . $dirName . '/sticker';
        $imagePath = (new Curl($url))->downloadFile($filename, ['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
        $this->convertImage($imagePath, 'webp');
    }

    private function downloadAuthorPhotos(array $photos, string $channelId)
    {
        $authorPhotoChannelDirectory = $this->authorPhotoDirectory . $channelId;
        if (!file_exists($authorPhotoChannelDirectory)) {
            mkdir($authorPhotoChannelDirectory, 0755, true);
        }

        $chosenUrl = $this->chooseThumbnailUrl($photos);
        $filename = $authorPhotoChannelDirectory . '/' . $this->encodeBase64Url($chosenUrl);
        if (file_exists($filename . '.jpeg')) {
            return;
        }
        try {
            $imagePath = (new Curl($chosenUrl))->downloadFile($filename, ['image/png', 'image/jpeg', 'image/webp']);
        } catch (\RuntimeException $e) {
            file_put_contents($filename . '.HAS_ERRORS', $chosenUrl);
            return;
        }
        $this->convertImage($imagePath, 'jpeg');
        // throttle
        if (random_int(0, 49) === 0) {
            sleep(2);
        }
    }

    private function chooseThumbnailUrl(array $thumbnails)
    {
        $maxWidth = null;
        $chosenUrl = null;
        foreach ($thumbnails as $thumbnail) {
            if (!$maxWidth || $thumbnail['width'] > $maxWidth) {
                $maxWidth = $thumbnail['width'];
                $chosenUrl = $thumbnail['url'];
            }
        }
        return $chosenUrl;
    }

    private function encodeBase64Url(string $data)
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function convertImage($path, $format)
    {
        $convertFn = function ($resource, $pathBase, $format) {
            switch ($format) {
                case 'png':
                    imagepng($resource, $pathBase . '.png');
                    break;
                case 'jpeg':
                    imagejpeg($resource, $pathBase . '.jpeg');
                    break;
                case 'webp':
                    imagewebp($resource, $pathBase . '.webp');
                    break;
                case 'gif':
                    imagegif($resource, $pathBase . '.gif');
                    break;
                default:
                    throw new \Exception('Unsupported format');
            }
        };

        $createResourceFn = function ($path) use ($format) {
            $imagePathInfo = pathinfo($path);
            $pathBase = $imagePathInfo['dirname'] . '/' . $imagePathInfo['filename'];
            if ($imagePathInfo['extension'] === $format) {
                // keep original
                return [null, $pathBase];
            }
            switch ($imagePathInfo['extension']) {
                case 'jpeg':
                    return [imagecreatefromjpeg($path), $pathBase];
                case 'png':
                    return [imagecreatefrompng($path), $pathBase];
                case 'webp':
                    return [imagecreatefromwebp($path), $pathBase];
                case 'gif':
                    return [imagecreatefromgif($path), $pathBase];
            }
        };

        [$imageResource, $pathBase] = $createResourceFn($path);
        if ($imageResource) {
            $convertFn($imageResource, $pathBase, $format);
        }
    }
}
