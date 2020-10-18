<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use \App\Domain\SystemCommand;

class ArchiveYoutubeChannel implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    const YTDL_BIN = 'youtube-dl-custom';

    private $channelUrl = null;
    private $force = null;

    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct($channelUrl, $force)
    {
        $this->channelUrl = $channelUrl;
        $this->force = $force;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        $first = true;
        foreach ($this->fetchChannelVideoIds($this->channelUrl) as $videoId) {
            $video = \App\Models\Video::find($videoId);
            if ($video) {
                if (!$this->force) {
                    continue;
                }
            } else {
                $video = new \App\Models\Video;
                $video->id = $videoId;
            }

            $videoDetails = $this->fetchVideoDetails($videoId);

            if ($first) {
                $first = false;
                \App\Models\Channel::firstOrCreate(
                    ['id' => $videoDetails['channel_id']],
                    ['name' => $videoDetails['uploader']]
                );
            }

            $video->fill([
                'channel_id' => $videoDetails['channel_id'],
                'title' => $videoDetails['title'],
                'description' => $videoDetails['description'],
                'duration' => $videoDetails['duration'],
                'view_count' => $videoDetails['view_count'],
                'average_rating' => $videoDetails['average_rating'],
                'thumbnail' => $videoDetails['thumbnail'],
                'upload_date' => sprintf(
                    '%s-%s-%s',
                    substr($videoDetails['upload_date'], 0, 4), // YYYY
                    substr($videoDetails['upload_date'], 4, 2), // MM
                    substr($videoDetails['upload_date'], 6, 2), // DD
                ),
                // TODO tables: categories, tags
            ]);

            $video->save();
        }
    }

    private function fetchChannelVideoIds(string $channelUrl)
    {
        $rawDetails = SystemCommand::run(self::YTDL_BIN, [
            '-j',
            '--flat-playlist',
            '--',
            $channelUrl,
        ]);

        $videoIds = [];

        foreach (preg_split('/\r?\n/', $rawDetails) as $rawDetail) {
            if (!$rawDetail) {
                continue;
            }
            $videoIds[] = json_decode($rawDetail, true)['id'];
        }

        return $videoIds;
    }

    private function fetchVideoDetails(string $videoId)
    {
        return json_decode(
            SystemCommand::run(self::YTDL_BIN, [
                '-j',
                '--',
                $videoId,
            ]),
            true
        );
    }
}
