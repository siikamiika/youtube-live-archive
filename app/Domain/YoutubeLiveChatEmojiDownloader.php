<?php

namespace App\Domain;

class YoutubeLiveChatEmojiDownloader
{
    private $video;
    private $file;

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

    public function downloadChatEmoji()
    {
        $directory = storage_path('app/public/images/live_chat_emoji/' . $this->video->channel->id . '/');
        if (!file_exists($directory)) {
            mkdir($directory, 0755, true);
        }

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
            if (!$renderer || !array_key_exists('message', $renderer)) { continue; }

            foreach ($renderer['message']['runs'] as $run) {
                if (!array_key_exists('emoji', $run)) { continue; }
                $emoji = $run['emoji'];
                [$channelId, $emojiId] = explode('/', $emoji['emojiId']);
                if (file_exists($directory . $emojiId . '.png')) { continue; }
                $emojiImage = null;
                foreach ($emoji['image']['thumbnails'] as $image) {
                    if (!$emojiImage || $image['width'] > $emojiImage['width']) {
                        $emojiImage = $image;
                    }
                }
                $imagePath = (new Curl($emojiImage['url']))->downloadFile($directory . $emojiId, ['image/png', 'image/jpeg']);
                $imagePathInfo = pathinfo($imagePath);
                // create a png equivalent but keep the original
                if ($imagePathInfo['extension'] === 'jpeg') {
                    $imageResource = \imagecreatefromjpeg($imagePath);
                    $pngPath = $imagePathInfo['dirname'] . '/' . $imagePathInfo['filename'] . '.png';
                    \imagepng($imageResource, $pngPath);
                }
            }
        }
    }
}
