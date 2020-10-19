<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ $video->title }} - YouTube Live Archive</title>

        <link href="/css/style.css" rel="stylesheet">
        <link href="/css/video/style.css" rel="stylesheet">
    </head>
    <body>
        <div>
            @if ($video->archived && $files->video)
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
            @elseif ($video->archived)
                {{-- TODO have a dedicated status for this somewhere. Also show progress --}}
                <div>
                    Video is being archived. Please come back later. If nothing happens, force video archival again from
                    <a href="/video_archive">/video_archive</a>.
                </div>
            @else
                <div>
                    <span>Video not archived.</span>
                    <form action="{{ rroute('video_archive_add') }}" method="post">
                        @csrf
                        <input type="hidden" name="video" value="{{ $video->id }}">
                        <input type="hidden" name="force" value="0">
                        <input type="submit" value="Archive video">
                    </form>
                </div>
            @endif
            <div>
                <h1>{{$video->title}}</h1>
                <ul>
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
            <pre class="video-description">{{
                $video->description
            }}</pre>
        </div>

        <script type="text/javascript">
            window.app = window.app || {};
            app.liveChatResource = {!! json_encode($files->live_chat->url ?? null) !!};
            app.videoId = {!! json_encode($video->id) !!};
        </script>
        <script type="text/javascript" src="/js/video/video.js"></script>
        <script type="text/javascript" src="/js/video/live-chat.js"></script>
    </body>
</html>
