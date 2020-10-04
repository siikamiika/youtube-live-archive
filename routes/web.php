<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

// index
Route::get('/', 'App\Http\Controllers\IndexController@index')->name('index');

// video archival
Route::get('/video_archive/', 'App\Http\Controllers\VideoArchiveController@index')->name('video_archive');
Route::post('/video_archive/add', 'App\Http\Controllers\VideoArchiveController@add')->name('video_archive_add');

// channel
Route::get('/channel/{channel}', 'App\Http\Controllers\ChannelController@index')->name('channel');

// video
Route::get('/video/{video}', 'App\Http\Controllers\VideoController@index')->name('video');
