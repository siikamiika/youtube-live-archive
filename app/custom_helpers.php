<?php

function rroute($name, $parameters = [])
{
    return app('url')->route($name, $parameters, false);
}

function sort_params($field, $defaultField, $defaultDirection)
{
    $currentField = request()->get('sort') ?? $defaultField;

    $directionOpposites = [
        'asc' => 'desc',
        'desc' => 'asc',
    ];

    $direction = $currentField === $field && in_array(request()->get('sort_direction'), [$defaultDirection, null], true)
        ? $directionOpposites[$defaultDirection]
        : $defaultDirection;

    return [
        'sort' => $field,
        'sort_direction' => $direction,
    ];
}

function sort_symbol($field, $defaultField)
{
    $fieldValue = request()->get('sort') ?? $defaultField;
    return $fieldValue === $field ? (request()->get('sort_direction') === 'asc' ? '▲' : '▼') : '';
}
