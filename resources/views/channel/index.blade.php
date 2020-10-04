<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ $channel->name }} - YouTube Live Archive</title>
    </head>
    <body>
        <h1>{{ $channel->name }}</h1>
        <ul>
            @foreach ($channel->videos as $video)
                <li>
                    <a href="{{ route('video', ['video' => $video]) }}">{{ $video->title }}</a>
                </li>
            @endforeach
        </ul>
    </body>
</html>
