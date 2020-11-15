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

                    <div id="live-chat">
                        <div class="live-chat-ticker-container">
                            <div id="live-chat-tickers"></div>
                        </div>
                        <div id="live-chat-banner"></div>
                        <div id="live-chat-messages"></div>
                    </div>
                </div>
            @elseif ($video->archived)
                {{-- TODO have a dedicated status for this somewhere. Also show progress --}}
                <div>
                    Video is being archived. Please come back later. If nothing happens, force video archival again from
                    <a href="/video_archive">/video_archive</a>.
                </div>
            @else
                <div>
                    <div class="video-thumbnail-preview"><img src="{{ $video->thumbnail }}"></div>
                    <span>Video not archived.</span>
                    <form action="{{ rroute('video_archive_add') }}" method="post">
                        @csrf
                        <input type="hidden" name="video" value="{{ $video->id }}">
                        <input type="hidden" name="force" value="0">
                        <input type="submit" value="Archive video">
                    </form>
                </div>
            @endif
        </div>

        <div>
            <h1>{{$video->title}}</h1>
            <div class="video-sub">
                @if ($video->upload_date && $video->view_count && $video->average_rating)
                    <span class="video-date">{{ $video->upload_date->format('Y-m-d') }} ({{ $video->upload_date->diffForHumans(['short' => true]) }})</span>
                    •
                    <span class="video-viewcount">{{ number_format($video->view_count) }} views</span>
                    •
                    <span class="video-rating">{{ number_format($video->average_rating, 2) }}/5</span>
                    •
                    <a target="_blank" rel="noopener noreferrer" class="youtube-video-link" href="https://www.youtube.com/watch?v={{ $video->id }}">YouTube</a>
                @endif
            </div>
        </div>

        <hr>


        <div class="channel">
            <a href="{{ rroute('channel', ['channel' => $video->channel]) }}">
                <div class="channel-avatar"><img src="/storage/images/channel_avatars/{{ $video->channel->id }}/avatar.jpeg"></div>
                <span class="channel-name">{{ $video->channel->name }}</span>
            </a>
        </div>

        <div>
            <pre class="video-description">{{
                $video->description
            }}</pre>
        </div>

        <script id="app-config" type="application/json">
            {!!  json_encode([
                'liveChatResource' => $files->live_chat->url ?? null,
                'videoId' => $video->id,
                'channelId' => $video->channel->id,
            ]) !!}
        </script>
        <script type="module" src="/js/video/app-config.js"></script>
        <script type="module" src="/js/video/video.js"></script>
        <script type="module" src="/js/video/live-chat.js"></script>
    </body>
</html>
