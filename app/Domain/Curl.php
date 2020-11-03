<?php

namespace App\Domain;

class Curl
{
    private static $ch = null;
    private string $url;

    public function __construct(string $url)
    {
        $this->url = $url;
        if (!self::$ch) {
            self::$ch = curl_init();
            $this->setDefaultOptions(self::$ch);
        }
    }

    public function downloadFile(string $basePath, array $acceptedMime=[])
    {
        $downloadPath = tempnam('/tmp', 'curl-dl-');

        curl_setopt(self::$ch, CURLOPT_URL, $this->url);
        $fp = fopen($downloadPath, 'wb');
        curl_setopt(self::$ch, CURLOPT_FILE, $fp);
        curl_exec(self::$ch);
        curl_setopt(self::$ch, CURLOPT_FILE, STDOUT);
        fclose($fp);

        $mime = (new \finfo)->file($downloadPath, FILEINFO_MIME_TYPE);
        if ($acceptedMime && !in_array($mime, $acceptedMime, true)) {
            throw new \RuntimeException('File type not allowed: ' . $mime);
        }

        $extension = $this->mimeToExtension($mime) ?? '';
        if ($extension) {
            $extension = '.' . $extension;
        }

        $path = $basePath . $extension;
        rename($downloadPath, $path);
        chmod($path, 0644);

        return $path;
    }

    public function downloadString(): string
    {
        curl_setopt(self::$ch, CURLOPT_URL, $this->url);
        curl_setopt(self::$ch, CURLOPT_RETURNTRANSFER, true);
        $data = curl_exec(self::$ch);
        curl_setopt(self::$ch, CURLOPT_RETURNTRANSFER, false);
        return $data;
    }

    private function setDefaultOptions($ch): void
    {
        curl_setopt($ch, CURLOPT_HEADER, false);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36');
        curl_setopt($ch, CURLOPT_ENCODING , '');
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language: en-us,en;q=0.5',
        ]);
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
