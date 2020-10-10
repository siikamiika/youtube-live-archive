<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateVideoFilesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('video_files', function (Blueprint $table) {
            $table->id();
            $table->string('video_id');
            $table->text('filename');
            $table->enum('type', ['video', 'audio', 'sub', 'live_chat']);
            $table->string('lang')->nullable();
            $table->text('raw_details')->nullable();
            $table->timestamps();
            $table->index('video_id');
            $table->foreign('video_id')->references('id')->on('videos');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('video_files');
    }
}
