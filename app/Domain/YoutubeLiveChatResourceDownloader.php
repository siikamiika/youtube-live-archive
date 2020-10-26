<?php

namespace App\Domain;

class YoutubeLiveChatResourceDownloader
{
    private $video;
    private $file;
    private $emojiDirectory;
    private $sponsorBadgeDirectory;

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
            $renderer = $item['liveChatTextMessageRenderer'] ?? $item['liveChatPaidMessageRenderer'] ?? null;
            if (!$renderer) { continue; }

            if (array_key_exists('message', $renderer)) {
                $this->downloadEmoji($renderer['message']['runs']);
            }
            if (array_key_exists('authorBadges', $renderer)) {
                $this->downloadSponsorBadges($renderer['authorBadges']);
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
            $this->processDownloadedImage($imagePath);
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
            $this->processDownloadedImage($imagePath);
        }
    }

    private function processDownloadedImage($path)
    {
        $imagePathInfo = pathinfo($path);
        // create a png equivalent but keep the original
        if ($imagePathInfo['extension'] === 'jpeg') {
            $imageResource = \imagecreatefromjpeg($path);
            $pngPath = $imagePathInfo['dirname'] . '/' . $imagePathInfo['filename'] . '.png';
            \imagepng($imageResource, $pngPath);
        }
    }
}
