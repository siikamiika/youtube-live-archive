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
        $videosQuery = $channel->videos();

        // filter
        if ($request->input('archived_only')) {
            $videosQuery->where('archived', true);
        }
        if ($request->input('contains_text')) {
            $videosQuery->where(function ($query) use ($request) {
                $text = $request->input('contains_text');
                $query->where('title', 'LIKE', '%'.$text.'%');
                $query->orWhere('description', 'LIKE', '%'.$text.'%');
            });
        }

        // sort
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

        $videosQuery->orderBy($orderField, $orderDirection);

        // paginate
        $videos = $videosQuery->paginate(30);
        $videos->withPath(rroute('channel', ['channel' => $channel]));

        return view('channel/index', [
            'channel' => $channel,
            'videos' => $videos,
            'sortFields' => [
                ['uploaded', 'desc', 'Uploaded'],
                ['views', 'desc', 'Views'],
                ['rating', 'desc', 'Rating'],
                ['duration', 'desc', 'Duration'],
                ['name', 'asc', 'Name'],
            ],
        ]);
    }
}
