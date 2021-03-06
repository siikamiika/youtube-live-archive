<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Artisan;
use \App\Domain\MediaFile;
use \App\Domain\SystemCommand;
use \App\Domain\YoutubeThumbnail;
use \App\Domain\YoutubeLiveChatResourceDownloader;
use \App\Domain\YoutubeChannelResourceDownloader;

class ArchiveYoutubeVideo implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    const YTDL_BIN = 'yt-dlp';

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
        if (!$this->videoId) {
            return;
        }

        $video = \App\Models\Video::find($this->videoId);
        if ($video) {
            if ($video->archived && !$this->force) {
                return;
            }
        } else {
            $video = new \App\Models\Video;
            $video->id = $this->videoId;
        }

        $videoDetails = $this->fetchVideoDetails($this->videoId);
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

        $liveChatResourceDownloader = new YoutubeLiveChatResourceDownloader($video);
        if ($liveChatResourceDownloader->openLiveChat()) {
            Artisan::call(
                'live_chat:import_raw',
                ['video_id' => $video->id]
            );
            $liveChatResourceDownloader->downloadChatResources();
        }
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

    private function downloadVideo($video, $channel)
    {
        // Avoid merging files to MKV and avoid collision in .webm video and audio
        SystemCommand::run(self::YTDL_BIN, [
            '-f', 'bestvideo',
            '-o', storage_path('app/public/video_data/%(channel_id)s/%(id)s/%(upload_date)s-%(title)s-%(id)s.video.%(ext)s'),
            '--',
            $video->id,
        ]);
        SystemCommand::run(self::YTDL_BIN, [
            '-f', 'bestaudio',
            '-o', storage_path('app/public/video_data/%(channel_id)s/%(id)s/%(upload_date)s-%(title)s-%(id)s.audio.%(ext)s'),
            '--',
            $video->id,
        ]);
        SystemCommand::run(self::YTDL_BIN, [
            '--skip-download',
            '--all-subs', // download all subtitles and live chat
            '-o', storage_path('app/public/video_data/%(channel_id)s/%(id)s/%(upload_date)s-%(title)s-%(id)s.%(ext)s'),
            '--',
            $video->id,
        ]);

        return glob(storage_path('app/public/video_data/'.$channel->id.'/'.$video->id.'/*'));
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
