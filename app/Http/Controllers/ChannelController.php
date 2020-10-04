<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Bus\DispatchesJobs;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;

class ChannelController extends BaseController
{
    public function index(\App\Models\Channel $channel) {
        return view('channel/index', ['channel' => $channel]);
    }
}
