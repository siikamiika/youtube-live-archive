<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Bus\DispatchesJobs;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Redirect;
use App\Jobs\ArchiveYoutubeVideo;
use Illuminate\Http\Request;

class VideoArchiveController extends BaseController
{
    public function index() {
        return view('archive/index');
    }

    public function add(Request $request) {
        ArchiveYoutubeVideo::dispatch($request->input('video'));
        return Redirect::back();
    }
}
