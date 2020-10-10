<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Bus\DispatchesJobs;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Storage;

class VideoController extends BaseController
{
    public function index(\App\Models\Video $video) {
        $video->load('channel');
        $video->load('files');

        $videoFileDetails = function ($videoFile) use ($video) {
            if (!$videoFile) {
                return null;
            }
            return (object)[
                'url' => $videoFile->getUrl($video),
                'lang' => $videoFile->lang ?? '',
            ];
        };

        $files = (object)[
            'video' => $videoFileDetails($video->files->where('type', 'video')->first()),
            'audio' => $videoFileDetails($video->files->where('type', 'audio')->first()),
            'subs' => $video->files->where('type', 'sub')->map($videoFileDetails),
            'live_chat' => $videoFileDetails($video->files->where('type', 'live_chat')->first()),
        ];

        return view('video/index', [
            'video' => $video,
            'files' => $files,
        ]);
    }
}
