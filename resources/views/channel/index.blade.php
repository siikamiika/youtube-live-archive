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
        <div class="video-card-list-controls">
            @foreach ($sortFields as [$field, $defaultSortDirection, $description])
                <a
                    href="{{ rroute('channel', ['channel' => $channel->id] + sort_params($field, 'uploaded', $defaultSortDirection)) }}"
                    class="video-card-list-control sort-{{ $field }}"
                >
                    {{ $description }} {{ sort_symbol($field, 'uploaded') }}
                </a>
            @endforeach
        </div>
        <ul class="video-card-list">
            @foreach ($videos as $video)
                <li class="video-card">
                    <a href="{{ rroute('video', ['video' => $video]) }}">
                        <div><img class="video-card-thumbnail" src="{{ $video->thumbnail }}" alt="thumbnail"></div>
                        <div><span class="video-card-title">{{ $video->title }}</span></div>
                        <div><span class="video-card-date">{{ $video->upload_date->format('Y-m-d') }} ({{ $video->upload_date->diffForHumans() }})</span></div>
                    </a>
                </li>
            @endforeach
        </ul>

        {{ $videos->withQueryString()->links('channel.pagination.videos') }}
    </body>
</html>
