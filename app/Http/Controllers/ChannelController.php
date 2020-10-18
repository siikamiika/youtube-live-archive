<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Bus\DispatchesJobs;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Http\Request;

class ChannelController extends BaseController
{
    public function index(Request $request, \App\Models\Channel $channel) {
        $orderField = [
            'uploaded' => 'upload_date',
            'views' => 'view_count',
            'rating' => 'average_rating',
            'duration' => 'duration',
            'name' => 'title',
        ][$request->input('sort')] ?? 'upload_date';

        $orderDirection = [
            'desc' => 'desc',
            'asc' => 'asc',
        ][$request->input('sort_direction')] ?? 'desc';

        $videos = $channel->videos()->orderBy($orderField, $orderDirection)->paginate(20);
        $videos->withPath('/channel/' . $channel->id);

        $sortFields = [
            ['uploaded', 'desc', 'Uploaded'],
            ['views', 'desc', 'Views'],
            ['rating', 'desc', 'Rating'],
            ['duration', 'desc', 'Duration'],
            ['name', 'asc', 'Name'],
        ];

        return view('channel/index', [
            'channel' => $channel,
            'videos' => $videos,
            'sortFields' => $sortFields,
        ]);
    }
}
