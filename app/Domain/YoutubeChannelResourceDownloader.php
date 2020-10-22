<?php

namespace App\Domain;

class YoutubeChannelResourceDownloader
{
    private $channel;
    private $channelHtml;
    private $ytInitialData;

    public function __construct($channel)
    {
        $this->channel = $channel;
    }

    public function loadChannel()
    {
        $this->channelHtml = (new Curl('https://www.youtube.com/channel/' . $this->channel->id))->downloadString();
        $this->ytInitialData = $this->getYtInitialData();
    }

    public function downloadBanner()
    {
        $directory = storage_path('app/public/images/channel_banners/' . $this->channel->id . '/');
        if (!file_exists($directory)) {
            mkdir($directory, 0755, true);
        }

        $bannerImage = null;
        $banners = $this->ytInitialData['header']['c4TabbedHeaderRenderer']['banner']['thumbnails'] ?? [];
        foreach ($banners as $image) {
            if (!$bannerImage || $image['width'] > $bannerImage['width']) {
                $bannerImage = $image;
            }
        }
        if (!$bannerImage) {
            throw new \RuntimeException('Could not find banner image');
        }
        (new Curl($bannerImage['url']))->downloadFile($directory . 'banner', ['image/jpeg']);
    }

    public function downloadAvatar()
    {
        $directory = storage_path('app/public/images/channel_avatars/' . $this->channel->id . '/');
        if (!file_exists($directory)) {
            mkdir($directory, 0755, true);
        }

        if (!preg_match('/\<meta property="og:image" content="(.*?)"\>/', $this->channelHtml, $matches)) {
            throw new \RuntimeException('Could not find avatar');
        }
        (new Curl($matches[1]))->downloadFile($directory . 'avatar', ['image/jpeg']);
    }

    private function getYtInitialData(): ?array
    {
        if (!preg_match('/window\["ytInitialData"\] = (\{.*?\});\n/', $this->channelHtml, $matches)) {
            return null;
        }
        return json_decode($matches[1], true);
    }
}
