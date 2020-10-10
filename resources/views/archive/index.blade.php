<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Archive new video - YouTube Live Archive</title>
    </head>
    <body>
        <h1>Archive new video</h1>
        <form action="{{ rroute('video_archive_add') }}" method="post">
            @csrf
            <div>
                <input type="text" name="video" id="video" required>
                <label for="video">YouTube video</label>
            </div>
            <div>
                <input type="checkbox" name="force" id="force">
                <label for="force">Force</label>
            </div>
            <div>
                <input type="submit" value="Archive">
            </div>
        </form>
    </body>
</html>
