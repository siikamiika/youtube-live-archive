<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VideoFile extends Model
{
    use HasFactory;

    // TODO use repository pattern
    // Note: load the Video Channel relationship to avoid a n+1 problem
    public function getPath(Video $video)
    {
        return storage_path(sprintf(
            'video_data/%s/%s/%s',
            $video->channel->id,
            $video->id,
            $this->filename,
        ));
    }

    public function getUrl(Video $video)
    {
        return url(sprintf(
            'storage/video_data/%s/%s/%s',
            $video->channel->id,
            $video->id,
            $this->filename,
        ));
    }

    public function video()
    {
        return $this->belongsTo(Video::class);
    }
}
