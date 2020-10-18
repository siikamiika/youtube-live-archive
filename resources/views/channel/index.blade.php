<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ $channel->name }} - YouTube Live Archive</title>

        <link href="/css/channel/style.css" rel="stylesheet">
    </head>
    <body>
        <h1>{{ $channel->name }}</h1>
        <ul class="video-card-list">
            @foreach ($channel->videos as $video)
                <li class="video-card">
                    <a href="{{ rroute('video', ['video' => $video]) }}">
                        <div><img class="video-card-thumbnail" src="{{ $video->thumbnail }}" alt="thumbnail"></img></div>
                        <div><span class="video-card-title">{{ $video->title }}</span></div>
                        <div><span class="video-card-date">{{ $video->upload_date->format('Y-m-d') }} ({{ $video->upload_date->diffForHumans() }})</span></div>
                    </a>
                </li>
            @endforeach
        </ul>
    </body>
</html>
