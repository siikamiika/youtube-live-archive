<?php

namespace App\Domain;

class SystemCommand
{
    public static function run(string $command, array $args)
    {
        return shell_exec($command . ' ' . implode(' ', array_map('escapeshellarg', $args)));
    }
}
