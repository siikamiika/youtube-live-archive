<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LiveChatMessage extends Model
{
    use HasFactory;

    protected $table = 'youtube_live_chat_message';
    protected $primaryKey = null;
    protected $guarded = [];
    protected $casts = [
        'data' => 'array'
    ];

    public function video()
    {
        return $this->belongsTo(Video::class);
    }

    // use previously acquired cursor to fetch next 100 events
    public function scopeWhereLastSequence($query, $sequence)
    {
        $query->where('seq', '>', $sequence ?? -1);
        $query->limit(500);
        return $query;
    }

    // use previously acquired cursor to fetch previous 100 events
    public function scopeWhereLastSequenceReverse($query, $sequence)
    {
        $query->where('seq', '<', $sequence);
        $query->orderBy('seq', 'desc');
        $query->limit(500);
        return $query;
    }

    // fetch all events 60 seconds before and after current time
    // when previous cursor is unknown (after seek or in the beginning)
    public function scopeWhereCurrentTime($query, $time)
    {
        $start = -2147483648;
        $end = 60000;
        if (isset($time) && $time > 5000) {
            $time = (int) round($time);
            $start = $time - 60000;
            $end = $time + 60000;
        }
        return $query->whereRaw('time_range && ?', [sprintf('[%s,%s)', $start, $end)]);
    }
}
