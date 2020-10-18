<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Video extends Model
{
    use HasFactory;

    public $keyType = 'string';

    protected $guarded = [];

    protected $casts = [
        'id' => 'string',
    ];

    protected $dates = ['upload_date'];

    public function channel()
    {
        return $this->belongsTo(Channel::class);
    }

    public function files()
    {
        return $this->hasMany(VideoFile::class);
    }
}
