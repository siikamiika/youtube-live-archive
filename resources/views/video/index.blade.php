<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ $video->title }} - YouTube Live Archive</title>

        <link href="/css/style.css" rel="stylesheet">
    </head>
    <body>
        <div>
            <div class="video-content-container">
                <div class="video-container">
                    <video id="video" controls poster="{{$video->thumbnail}}">
                        <source src="{{ $files->video->url }}">
                        @foreach ($files->subs as $sub)
                            <track label="{{ $sub->lang }}" srclang="{{ $sub->lang }}" kind="subtitles" src="{{ $sub->url }}">
                        @endforeach
                    </video>

                    @if ($files->audio)
                        <audio id="audio">
                            <source src="{{ $files->audio->url }}">
                        </audio>
                    @endif
                </div>

                <div id="live-chat"></div>
            </div>
            <div>
                <h1>{{$video->title}}</h1>
                <ul>
                    <li>Duration: {{$video->duration}}</li>
                    <li>Views: {{$video->view_count}}</li>
                    <li>Rating: {{$video->average_rating}}</li>
                    <li>Uploaded: {{$video->upload_date}}</li>
                </ul>
            </div>
        </div>
        <div>
            <a href="{{ rroute('channel', ['channel' => $video->channel]) }}">{{ $video->channel->name }}</a>
        </div>
        <div>
            <a href="https://www.youtube.com/watch?v={{ $video->id }}">YouTube link</a>
        </div>
        <div>
            <pre>{{
                $video->description
            }}</pre>
        </div>

        <script type="text/javascript">
            window.app = window.app || {};
            app.liveChatResource = {!! json_encode($files->live_chat->url ?? null) !!};
        </script>
        <script type="text/javascript" src="/js/video/video.js"></script>
        <script type="text/javascript" src="/js/video/live-chat.js"></script>
    </body>
</html>
