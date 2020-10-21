<?php

namespace App\Domain;

class YoutubeThumbnail
{
    public static function download(string $url, $video, $channel): string
    {
        $directory = storage_path('app/public/images/thumbnails/' . $channel->id . '/' . $video->id . '/');
        if (!file_exists($directory)) {
            mkdir($directory, 0755, true);
        }

        $path = (new Curl($url))->downloadFile($directory . 'thumbnail');

        // relative URL
        return '/storage/images/thumbnails/' . $channel->id . '/' . $video->id . '/' . basename($path);
    }
}
