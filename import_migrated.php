<?php

foreach (glob('storage/app/public/video_data/*') as $channelPath) {
    $channelId = basename($channelPath);
    foreach (glob($channelPath . '/*') as $videoPath) {
        $videoId = basename($videoPath);
        if (!file_exists($videoPath . '/video_details.json')) { continue; }

        var_export([$channelId, $videoId]);
        passthru(sprintf(
            'php artisan video:import_migrated -- %s %s',
            $channelId,
            $videoId
        ));
    }
}
