<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VideoFile extends Model
{
    use HasFactory;

    protected $guarded = [];

    // TODO use repository pattern
    // Note: load the Video Channel relationship to avoid an n+1 problem
    public function getUrl(Video $video)
    {
        return sprintf(
            '/storage/video_data/%s/%s/%s',
            rawurlencode($video->channel->id),
            rawurlencode($video->id),
            rawurlencode($this->filename),
        );
    }

    public function getPath(Video $video)
    {
        return storage_path(sprintf(
            'app/public/video_data/%s/%s/%s',
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
