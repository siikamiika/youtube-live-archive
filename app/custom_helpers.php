<?php

function rroute($name, $parameters = [])
{
    return app('url')->route($name, $parameters, false);
}
