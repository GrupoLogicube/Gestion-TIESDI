<?php

namespace App\Http\Middleware;

use App\Models\Event;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureModuleEnabled
{
    public function handle(Request $request, Closure $next, string $moduleKey): Response
    {
        $eventParam = $request->route('event');

        $event = $eventParam instanceof Event
            ? $eventParam
            : Event::findOrFail($eventParam);

        if (! $event->hasModuleEnabled($moduleKey)) {
            return response()->json([
                'message' => "The '{$moduleKey}' module is disabled for this event.",
            ], 403);
        }

        return $next($request);
    }
}

