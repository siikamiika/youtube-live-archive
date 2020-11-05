<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use \App\Domain\MediaFile;
use \App\Domain\YoutubeThumbnail;
use \App\Domain\YoutubeLiveChatResourceDownloader;
use \App\Domain\YoutubeChannelResourceDownloader;

class ImportMigratedVideo extends Command
{
    protected $signature = 'video:import_migrated {channel_id} {video_id}';
    protected $description = 'Import video from migrated video files and details';

    public function handle()
    {
        $channelId = $this->argument('channel_id');
        $videoId = $this->argument('video_id');

        $video = \App\Models\Video::find($videoId);
        if ($video) {
            if ($video->archived) {
                return;
            }
        } else {
            $video = new \App\Models\Video;
            $video->id = $videoId;
        }

        $videoDetails = $this->fetchVideoDetails($channelId, $videoId);
        if (!$videoDetails) {
            throw new \RuntimeException('No video details');
        }

        $channel = \App\Models\Channel::find($videoDetails['channel_id']);
        if (!$channel) {
            $channel = new \App\Models\Channel;
            $channel->id = $videoDetails['channel_id'];
            $channel->name = $videoDetails['uploader'];

            $channelResourceDownloader = new YoutubeChannelResourceDownloader($channel);
            $channelResourceDownloader->loadChannel();
            $channelResourceDownloader->downloadBanner();
            $channelResourceDownloader->downloadAvatar();

            $channel->save();
        }

        $video->setRelation('channel', $channel);

        $video->fill([
            'channel_id' => $videoDetails['channel_id'],
            'title' => $videoDetails['title'],
            'description' => $videoDetails['description'],
            'duration' => $videoDetails['duration'],
            'view_count' => $videoDetails['view_count'],
            'average_rating' => $videoDetails['average_rating'],
            'thumbnail' => YoutubeThumbnail::download($videoDetails['thumbnail'], $video, $channel),
            'archived' => true,
            'upload_date' => sprintf(
                '%s-%s-%s',
                substr($videoDetails['upload_date'], 0, 4), // YYYY
                substr($videoDetails['upload_date'], 4, 2), // MM
                substr($videoDetails['upload_date'], 6, 2), // DD
            ),
            // TODO tables: categories, tags
        ]);

        $video->save();

        foreach ($this->listVideoFiles($video, $channel) as $path) {
            $fileDetails = MediaFile::getDetails($path);
            if (!$fileDetails) {
                Log::warning('Unrecognized file type: ' . $path);
                continue;
            }

            \App\Models\VideoFile::firstOrCreate(
                [
                    'video_id' => $video->id,
                    'type' => $fileDetails['type'],
                    'lang' => $fileDetails['lang'],
                ],
                [
                    'filename' => basename($path),
                    'raw_details' => json_encode($fileDetails['raw_details']),
                ]
            );
        }

        $liveChatResourceDownloader = new YoutubeLiveChatResourceDownloader($video);
        if ($liveChatResourceDownloader->openLiveChat()) {
            $liveChatResourceDownloader->downloadChatResources();
        }

        return 0;
    }

    private function fetchVideoDetails(string $channelId, string $videoId)
    {
        return json_decode(
            file_get_contents(
                storage_path(
                    'app/public/video_data/'.$channelId.'/'.$videoId.'/video_details.json'
                )
            ),
            true
        );
    }

    private function listVideoFiles($video, $channel)
    {
        return glob(storage_path('app/public/video_data/'.$channel->id.'/'.$video->id.'/*'));
    }
}
