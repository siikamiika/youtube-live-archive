<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ArchiveYoutubeVideo implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    const YTDL_BIN = 'youtube-dl-custom';
    const FFPROBE_BIN = 'ffprobe';

    private $videoId = null;

    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct($videoQuery)
    {
        $this->videoId = $this->parseVideoId($videoQuery);
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        // TODO notify user on invalid video ID
        if (!$this->videoId || \App\Models\Video::where('id', $this->videoId)->exists()) {
            return;
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
            $fileDetails = $this->getFileDetails($path);
            if (!$fileDetails) {
                Log::warning('Unrecognized file type: ' . $path);
                continue;
            }

            $videoFile = new \App\Models\VideoFile;
            $videoFile->video_id = $video->id;
            $videoFile->filename = basename($path);
            $videoFile->type = $fileDetails['type'];
            $videoFile->raw_details = json_encode($fileDetails['raw_details']);
            $videoFile->save();
        }

        \DB::commit();
    }

    private function fetchVideoDetails(string $videoId)
    {
        return json_decode(
            $this->runCommand(self::YTDL_BIN, [
                '-j',
                $videoId,
            ]),
            true
        );
    }

    private function downloadVideo($video, $channel)
    {
        $this->runCommand(self::YTDL_BIN, [
            '-f', 'bestvideo,bestaudio', // don't merge files to MKV
            '--all-subs', // download all subtitles and live chat
            '-o', 'storage/app/public/video_data/%(channel_id)s/%(id)s/%(upload_date)s-%(title)s-%(id)s.%(ext)s',
            '--',
            $video->id,
        ]);

        return glob('storage/app/public/video_data/'.$channel->id.'/'.$video->id.'/*');
    }

    private function getFileDetails(string $path)
    {
        // guess file type based on extension only
        $extensionTypes = [
            '.live_chat.json' => 'live_chat',
        ];
        foreach ($extensionTypes as $extension => $type) {
            if (substr($path, -strlen($extension)) === $extension) {
                return [
                    'type' => $type,
                    'raw_details' => null,
                ];
            }
        }

        $mediaFileDetails = $this->getMediaFileDetails($path);

        if (!isset($mediaFileDetails[0]) || !in_array($mediaFileDetails[0]['type'], ['video', 'audio', 'sub'])) {
            Log::error(sprintf(
                '%s has no valid streams: %s',
                $path,
                json_encode($mediaFileDetails),
            ));
            return null;
        }

        if (count($mediaFileDetails) > 1) {
            Log::warning(sprintf(
                '%s has %s streams. Using the first one. %s',
                $path,
                count($mediaFileDetails),
                json_encode($mediaFileDetails),
            ));
        }

        return $mediaFileDetails[0];
    }

    // Current extractor: ffprobe
    // Format:
    // [
    //   0 => [
    //       'type' => 'audio'|'video'|'sub'|null,
    //       'raw_details' => [
    //           'type' => 'ffprobe',
    //           'data' => [...],
    //       ],
    //   ],
    //   ...
    // ]
    private function getMediaFileDetails(string $path)
    {
        // extract file data with ffprobe
        $ffprobeOutput = $this->runCommand(self::FFPROBE_BIN, [
            '-loglevel', 'quiet',
            '-hide_banner',
            '-show_streams',
            '-i', $path,
        ]);

        $ffprobeOutput = explode("\n", $ffprobeOutput);

        if (!isset($ffprobeOutput[0]) || $ffprobeOutput[0] !== '[STREAM]') {
            return [];
        }

        $index = -1;
        $streamInfo = [];
        foreach ($ffprobeOutput as $line) {
            if (!$line || $line === '[STREAM]' || $line === '[/STREAM]') {
                continue;
            }

            [$k, $v] = explode('=', $line, 2);

            if ($k === 'index') {
                $index = (int) $v;
                $streamInfo[$index] = [
                    'type' => null,
                    'raw_details' => [
                        'type' => 'ffprobe',
                        'data' => [],
                    ]
                ];
            }

            if ($k === 'codec_type') {
                $streamInfo[$index]['type'] = [
                    'video' => 'video',
                    'audio' => 'audio',
                    'subtitles' => 'sub',
                ][$v] ?? null;
            }

            $streamInfo[$index]['raw_details']['data'][$k] = $v;
        }

        return $streamInfo;
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

    private function runCommand(string $command, array $args)
    {
        return shell_exec($command . ' ' . implode(' ', array_map('escapeshellarg', $args)));
    }
}
