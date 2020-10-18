<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Bus\DispatchesJobs;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Redirect;
use App\Jobs\ArchiveYoutubeVideo;
use App\Jobs\ArchiveYoutubeChannel;
use Illuminate\Http\Request;

class VideoArchiveController extends BaseController
{
    public function index() {
        return view('archive/index');
    }

    public function add(Request $request) {
        ArchiveYoutubeVideo::dispatch($request->input('video'), $request->input('force'));
        return Redirect::back();
    }

    public function addChannel(Request $request) {
        ArchiveYoutubeChannel::dispatch($request->input('channel'), $request->input('force'));
        return Redirect::back();
    }
}
