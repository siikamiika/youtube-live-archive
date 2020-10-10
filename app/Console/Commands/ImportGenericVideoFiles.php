<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use \App\Domain\MediaFile;
use Symfony\Component\Filesystem\Filesystem;

class ImportGenericVideoFiles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'video_files:import_generic {channel_id} {video_id} {files*}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import video files under an existing or a new video';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $channelId = $this->argument('channel_id');
        $videoId = $this->argument('video_id');

        $channel = \App\Models\Channel::firstOrCreate(
            ['id' => $channelId],
            ['name' => $channelId]
        );

        $video = \App\Models\Video::firstOrCreate(
            ['id' => $videoId],
            ['channel_id' => $channel->id, 'title' => $videoId]
        );

        $videoPath = storage_path(sprintf(
            'app/public/video_data/%s/%s/',
            $channel->id,
            $video->id,
        ));

        $filesystem = new Filesystem;
        $filesystem->mkdir($videoPath, 0755);

        foreach ($this->argument('files') as $path) {
            $filename = basename($path);
            $absPath = $filesystem->readlink($path, true);

            if (!$absPath) {
                throw new \RuntimeException('File not found: ' . $path);
            }

            $fileDetails = MediaFile::getDetails($absPath);
            if (!$fileDetails) {
                continue;
            }
            // only VTT subs are supported by browsers
            if ($fileDetails['type'] === 'sub' && substr($absPath, -4) !== '.vtt') {
                continue;
            }

            $filesystem->symlink($absPath, $videoPath . '/' . $filename);

            \App\Models\VideoFile::firstOrCreate(
                [
                    'video_id' => $video->id,
                    'type' => $fileDetails['type'],
                    'lang' => $fileDetails['lang'],
                ],
                [
                    'filename' => $filename,
                    'raw_details' => json_encode($fileDetails['raw_details']),
                ]
            );
        }

        return 0;
    }
}
