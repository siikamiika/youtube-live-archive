<?php

namespace App\Domain;

class YoutubeLiveChatResourceDownloader
{
    private $video;
    private $file;
    private $emojiDirectory;
    private $sponsorBadgeDirectory;
    private $stickerDirectory;

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
    }

    public function downloadChatResources()
    {
        $this->ensureDirectories();

        while ($line = stream_get_line($this->file, 0x100000, "\n")) {
            $action = json_decode($line, true);
            $actions = $action['replayChatItemAction']['actions'] ?? null;
            if (!$actions) { continue; }
            $chatAction = null;
            foreach ($actions as $action2) {
                if (array_key_exists('addChatItemAction', $action2)) {
                    $chatAction = $action2['addChatItemAction'];
                    break;
                }
            }
            if (!$chatAction) { continue; }

            $item = $chatAction['item'];
            $renderer = $item['liveChatTextMessageRenderer'] ?? $item['liveChatPaidMessageRenderer'] ?? $item['liveChatPaidStickerRenderer'] ?? null;
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
            if (preg_match('/New member/', $badgeRenderer['tooltip'])) {
                $duration = 0;
            } else {
                if (!preg_match('/Member \((?:(\d+) years?\, (\d+) months?)|(?:(\d+) years?)|(?:(\d+) months?)\)/', $badgeRenderer['tooltip'], $matches)) {
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

            $imagePath = (new Curl($badgeThumbnail['url']))->downloadFile($this->sponsorBadgeDirectory . $durationMilestone, ['image/png', 'image/jpeg']);
            $this->convertImage($imagePath, 'png');
        }
    }

    private function downloadStickers(array $stickers)
    {
        $maxWidth = null;
        $chosenUrl = null;
        foreach ($stickers as $sticker) {
            if (!$maxWidth || $sticker['width'] > $maxWidth) {
                $maxWidth = $sticker['width'];
                $chosenUrl = $sticker['url'];
            }
        }

        if (!preg_match('/^(?:https?:)?\/\/(.*)/', $chosenUrl, $matches)) {
            throw new \RuntimeException('Cannot parse sticker url');
        }

        $url = 'https://' . $matches[1];
        $dirName = rtrim(strtr(base64_encode($matches[1]), '+/', '-_'), '=');

        if (file_exists($this->stickerDirectory . $dirName)) {
            return;
        }
        mkdir($this->stickerDirectory . $dirName, 0755, true);

        $filename = $this->stickerDirectory . $dirName . '/sticker';
        $imagePath = (new Curl($url))->downloadFile($filename, ['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
        $this->convertImage($imagePath, 'webp');
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
