<?php

namespace App\Domain;

class SystemCommand
{
    public static function run(string $command, array $args)
    {
        // what he said
        // https://github.com/mpv-player/mpv/commit/1e70e82baa9193f6f027338b0fab0f5078971fbe
        $oldLocale = setlocale(LC_CTYPE, 0);
        setlocale(LC_CTYPE, 'en_US.UTF_8');
        $output = shell_exec($command . ' ' . implode(' ', array_map('escapeshellarg', $args)));
        setlocale(LC_CTYPE, $oldLocale);
        return $output;
    }
}
