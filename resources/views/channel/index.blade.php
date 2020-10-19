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

        <form action="{{ rroute('video_archive_add_channel') }}" method="post">
            @csrf
            <input type="hidden" name="channel" value="https://www.youtube.com/channel/{{ $channel->id }}">
            <input type="hidden" name="force" value="0">
            <input type="submit" value="Fetch new videos">
        </form>

        <hr>

        <div class="video-card-list-controls">
            <div class="video-card-list-filtering">
                <form action="{{ rroute('channel', ['channel' => $channel]) }}" method="get">
                    @foreach (request()->all() as $key => $value)
                        @if (in_array($key, ['contains_text', 'archived_only']))
                            @continue
                        @endif
                        <input type="hidden" name="{{ $key }}" value="{{ $value }}">
                    @endforeach
                    <div>
                        <input type="text" value="{{ request()->get('contains_text') }}" name="contains_text" id="contains_text">
                        <label for="contains_text">Contains text</label>
                    </div>
                    <div>
                        <input onchange="this.form.submit()" type="checkbox" {{ request()->get('archived_only') ? 'checked' : '' }} name="archived_only" id="archived_only">
                        <label for="archived_only">Archived only</label>
                    </div>
                </form>
            </div>
            <div class="video-card-list-sorting">
                @foreach ($sortFields as [$field, $defaultSortDirection, $description])
                    <a
                        href="{{ rroute('channel', ['channel' => $channel] + sort_params($field, 'uploaded', $defaultSortDirection) + request()->all()) }}"
                        class="video-card-list-sort sort-{{ $field }}"
                    >
                        {{ $description }} {{ sort_symbol($field, 'uploaded') }}
                    </a>
                @endforeach
            </div>
        </div>

        <ul class="video-card-list">
            @foreach ($videos as $video)
                <li class="video-card {{ $video->archived ? '' : 'unarchived' }}">
                    <a href="{{ rroute('video', ['video' => $video]) }}">
                        <div class="video-card-thumbnail-container">
                            <img class="video-card-thumbnail" src="{{ $video->thumbnail }}" alt="thumbnail">
                            <div class="video-card-duration">{{ gmdate('H:i:s', $video->duration) }}</div>
                        </div>
                        <div><span class="video-card-title">{{ $video->title }}</span></div>
                        @if ($video->upload_date && $video->view_count && $video->average_rating)
                            <div class="video-card-sub">
                                <span class="video-card-date">{{ $video->upload_date->format('Y-m-d') }} ({{ $video->upload_date->diffForHumans() }})</span>
                                •
                                <span class="video-card-viewcount">{{ number_format($video->view_count) }} views</span>
                                •
                                <span class="video-card-rating">{{ number_format($video->average_rating, 2) }}/5</span>
                            </div>
                        @endif
                    </a>
                </li>
            @endforeach
        </ul>

        {{ $videos->withQueryString()->links('channel.pagination.videos') }}
    </body>
</html>
