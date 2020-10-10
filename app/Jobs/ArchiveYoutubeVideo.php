<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use \App\Domain\MediaFile;
use \App\Domain\SystemCommand;

class ArchiveYoutubeVideo implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    const YTDL_BIN = 'youtube-dl-custom';

    private $videoId = null;
    private $force = null;

    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct($videoQuery, $force)
    {
        $this->videoId = $this->parseVideoId($videoQuery);
        $this->force = $force;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        // TODO notify user on invalid video ID
        if (!$this->force) {
            if (!$this->videoId || \App\Models\Video::where('id', $this->videoId)->exists()) {
                return;
            }
        }

        $videoDetails = $this->fetchVideoDetails($this->videoId);

        \DB::beginTransaction();

        $channel = \App\Models\Channel::firstOrCreate(
            ['id' => $videoDetails['channel_id']],
            ['name' => $videoDetails['uploader']]
        );

        $video = \App\Models\Video::firstOrCreate(
            [
                'id' => $videoDetails['id']
            ],
            [
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
            ]
        );

        foreach ($this->downloadVideo($video, $channel) as $path) {
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

        \DB::commit();
    }

    private function fetchVideoDetails(string $videoId)
    {
        return json_decode(
            SystemCommand::run(self::YTDL_BIN, [
                '-j',
                $videoId,
            ]),
            true
        );
    }

    private function downloadVideo($video, $channel)
    {
        SystemCommand::run(self::YTDL_BIN, [
            '-f', 'bestvideo,bestaudio', // don't merge files to MKV
            '--all-subs', // download all subtitles and live chat
            '-o', 'storage/app/public/video_data/%(channel_id)s/%(id)s/%(upload_date)s-%(title)s-%(id)s.%(ext)s',
            '--',
            $video->id,
        ]);

        return glob('storage/app/public/video_data/'.$channel->id.'/'.$video->id.'/*');
    }

    private function parseVideoId(string $videoQuery)
    {
        $videoQuery = trim($videoQuery);
        $res = null;
        $videoIdPattern = '[a-zA-Z0-9_\-]{11}';
        if (preg_match('/^('.$videoIdPattern.')$/', $videoQuery, $res)) {
            return $res[1];
        }
        if (preg_match('/\?v=('.$videoIdPattern.')&?/', $videoQuery, $res)) {
            return $res[1];
        }
        return null;
    }
}
