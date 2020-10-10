<?php

namespace App\Domain;

use Illuminate\Support\Facades\Log;

class MediaFile
{
    const FFPROBE_BIN = 'ffprobe';

    public static function getDetails(string $path)
    {
        // guess file type based on extension only
        $extensionTypes = [
            '.live_chat.json' => 'live_chat',
        ];
        foreach ($extensionTypes as $extension => $type) {
            if (substr($path, -strlen($extension)) === $extension) {
                return [
                    'type' => $type,
                    'codec' => null,
                    'lang' => null,
                    'raw_details' => null,
                ];
            }
        }

        $mediaFileDetails = self::extractMediaDetails($path);

        if (!isset($mediaFileDetails[0]) || !in_array($mediaFileDetails[0]['type'], ['video', 'audio', 'sub'])) {
            Log::debug(sprintf(
                '%s has no streams: %s',
                $path,
                json_encode($mediaFileDetails),
            ));
            return null;
        }

        if ($mediaFileDetails[0]['type'] === 'video' && in_array($mediaFileDetails[0]['codec'], ['mjpeg', 'png'])) {
            Log::debug(sprintf(
                '%s is an image, skipping',
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
    private static function extractMediaDetails(string $path)
    {
        $lang = self::parsePathLang($path);

        // extract file data with ffprobe
        $ffprobeOutput = SystemCommand::run(self::FFPROBE_BIN, [
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
                    'codec' => null,
                    'lang' => $lang,
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
                    'subtitle' => 'sub',
                ][$v] ?? null;
            } elseif ($k === 'codec_name') {
                $streamInfo[$index]['codec'] = $v;
            }

            $streamInfo[$index]['raw_details']['data'][$k] = $v;
        }

        return $streamInfo;
    }

    private static function parsePathLang(string $path)
    {
        $match = null;
        preg_match('/\.((?:[a-z]{2})(?:[_\-][A-Z]{2})?)\.[a-z]+$/', $path, $match);
        return $match[1] ?? null;
    }
}
