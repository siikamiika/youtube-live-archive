<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Models\LiveChatMessage;
use App\Http\Resources\LiveChatMessage as LiveChatMessageResource;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware('auth:api')->get('/user', function (Request $request) {
    return $request->user();
});

// live chat
Route::get('/live_chat_replay/{video_id}', function (Request $request, string $video_id) {
    $lastSequence = $request->query('lastSequence');
    $currentTime = $request->query('currentTime');
    $query = LiveChatMessage::query()
        ->where('video_id', $video_id);
    if ($lastSequence && $lastSequence > 0) {
        $query->whereLastSequence($lastSequence);
    } else {
        $query->whereCurrentTime($currentTime);
    }
    return LiveChatMessageResource::collection(
        $query->orderBy('seq')->get()
    );
});
