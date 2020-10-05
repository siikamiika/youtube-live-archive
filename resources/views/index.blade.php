<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>YouTube Live Archive</title>
    </head>
    <body>
        <div>
            <a href="{{ route('video_archive') }}">Archive new video</a>
        </div>
        <h1>Channels</h1>
        <ul>
            @foreach ($channels as $channel)
                <li>
                    <a href="{{ route('channel', ['channel' => $channel]) }}">{{ $channel->name }}</a>
                </li>
            @endforeach
        </ul>
    </body>
</html>