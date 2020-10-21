<?php

namespace App\Domain;

class Curl
{
    private string $url;

    public function __construct(string $url)
    {
        $this->url = $url;
    }

    public function downloadFile(string $basePath)
    {
        $downloadPath = tempnam('/tmp', 'curl-dl-');

        $ch = curl_init($this->url);
        $fp = fopen($downloadPath, 'wb');
        curl_setopt($ch, CURLOPT_FILE, $fp);
        curl_setopt($ch, CURLOPT_HEADER, false);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36');
        curl_exec($ch);
        curl_close($ch);
        fclose($fp);

        $extension = $this->mimeToExtension((new \finfo)->file($downloadPath, FILEINFO_MIME_TYPE)) ?? '';
        if ($extension) {
            $extension = '.' . $extension;
        }

        $path = $basePath . $extension;
        rename($downloadPath, $path);
        chmod($path, 0644);

        return $path;
    }

    private function mimeToExtension(string $mimeType): ?string
    {
        // images only for now
        return [
            'image/bmp'                => 'bmp',
            'image/x-bmp'              => 'bmp',
            'image/x-bitmap'           => 'bmp',
            'image/x-xbitmap'          => 'bmp',
            'image/x-win-bitmap'       => 'bmp',
            'image/x-windows-bmp'      => 'bmp',
            'image/ms-bmp'             => 'bmp',
            'image/x-ms-bmp'           => 'bmp',
            'image/gif'                => 'gif',
            'image/x-icon'             => 'ico',
            'image/x-ico'              => 'ico',
            'image/vnd.microsoft.icon' => 'ico',
            'image/jp2'                => 'jp2',
            'image/jpx'                => 'jp2',
            'image/jpm'                => 'jp2',
            'image/jpeg'               => 'jpeg',
            'image/pjpeg'              => 'jpeg',
            'image/png'                => 'png',
            'image/x-png'              => 'png',
            'image/svg+xml'            => 'svg',
            'video/webm'               => 'webm',
            'image/webp'               => 'webp',
        ][$mimeType] ?? null;
    }
}
