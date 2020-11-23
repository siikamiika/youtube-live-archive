<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VideoFile extends Model
{
    use HasFactory;

    protected $guarded = [];

    // TODO use repository pattern
    public function getUrl(Video $video)
    {
        return sprintf(
            '/storage/video_data/%s/%s/%s',
            rawurlencode($video->channel_id),
            rawurlencode($video->id),
            rawurlencode($this->filename),
        );
    }

    public function getPath(Video $video)
    {
        return storage_path(sprintf(
            'app/public/video_data/%s/%s/%s',
            $video->channel_id,
            $video->id,
            $this->filename,
        ));
    }

    public function video()
    {
        return $this->belongsTo(Video::class);
    }
}
