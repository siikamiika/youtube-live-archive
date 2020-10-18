<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateVideosTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('videos', function (Blueprint $table) {
            $table->string('id')->unique();
            $table->string('channel_id')->nullable();
            $table->text('title')->nullable();
            $table->text('description')->nullable();
            $table->unsignedInteger('duration')->nullable();
            $table->unsignedBigInteger('view_count')->nullable();
            $table->float('average_rating', 10, 6)->nullable();
            $table->text('thumbnail')->nullable();
            $table->boolean('archived')->default(false);
            // TODO tables: categories, tags
            $table->datetime('upload_date')->nullable();
            $table->timestamps();
            $table->foreign('channel_id')->references('id')->on('channels')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('videos');
    }
}
