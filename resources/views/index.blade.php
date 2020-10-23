<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>YouTube Live Archive</title>

        <link href="/css/style.css" rel="stylesheet">
        <link href="/css/index.style.css" rel="stylesheet">
    </head>
    <body>
        <div>
            <a href="{{ rroute('video_archive') }}">Archive new video or channel</a>
        </div>
        <h1>Channels</h1>
        <ul class="channel-list">
            @foreach ($channels as $channel)
                <li class="channel">
                    <a href="{{ rroute('channel', ['channel' => $channel]) }}">
                        <div class="channel-avatar"><img src="/storage/images/channel_avatars/{{ $channel->id }}/avatar.jpeg"></div>
                        <div class="channel-text">
                            <div class="channel-name">{{ $channel->name }}</div>
                        </div>
                    </a>
                </li>
            @endforeach
        </ul>
    </body>
</html>
