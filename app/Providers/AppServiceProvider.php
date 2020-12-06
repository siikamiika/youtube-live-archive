<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        //
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        $skipQueries = [
            '/^select \* from "youtube_live_chat_message".*$/',
            '/^insert into "youtube_live_chat_message".*$/',
            '/^select \* from "jobs".*$/',
        ];
        \DB::listen(function($query) use ($skipQueries) {
            foreach ($skipQueries as $skipQuery) {
                if (preg_match($skipQuery, $query->sql)) {
                    return;
                }
            }
            \Log::info(
                $query->sql,
                $query->bindings,
                $query->time
            );
        });
    }
}
