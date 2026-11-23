<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventProvider;
use App\Models\ProviderChecklistItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProviderPortalController extends Controller
{
    public function events(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->hasPermissionTo('providers.view_assigned'), 403);

        $assignments = EventProvider::query()
            ->where('user_id', $user->id)
            ->whereHas('event.modules', function ($query) {
                $query->where('module_key', 'providers')->where('is_enabled', true);
            })
            ->with(['event', 'provider', 'checklistItems'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $assignments]);
    }

    public function showEvent(Request $request, Event $event): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->hasPermissionTo('providers.view_assigned'), 403);

        $assignment = EventProvider::query()
            ->where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->with(['event', 'provider', 'checklistItems'])
            ->first();

        abort_unless($assignment !== null, 403, 'You are not assigned to this event.');

        return response()->json(['data' => $assignment]);
    }

    public function schedule(Request $request, Event $event): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->hasPermissionTo('schedule.view'), 403);

        $assignment = EventProvider::query()
            ->where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->first();

        abort_unless($assignment !== null, 403, 'You are not assigned to this event.');

        $scheduleItems = $event->scheduleItems()
            ->orderBy('starts_at')
            ->orderBy('sort_order')
            ->get()
            ->map(function ($item) use ($assignment) {
                return [
                    'id' => $item->id,
                    'title' => $item->title,
                    'description' => $item->description,
                    'starts_at' => $item->starts_at?->toISOString(),
                    'ends_at' => $item->ends_at?->toISOString(),
                    'location_area' => $item->location_area,
                    'is_mine' => $item->event_provider_id === $assignment->id,
                ];
            });

        return response()->json([
            'data' => [
                'event_id' => $event->id,
                'my_timings' => [
                    'setup_at' => $assignment->setup_at?->toISOString(),
                    'show_at' => $assignment->show_at?->toISOString(),
                    'teardown_at' => $assignment->teardown_at?->toISOString(),
                ],
                'schedule' => $scheduleItems,
            ],
        ]);
    }

    public function toggleChecklistItem(Request $request, ProviderChecklistItem $checklistItem): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->hasPermissionTo('providers.toggle_checklist'), 403);

        $assignment = $checklistItem->eventProvider()->with('event')->firstOrFail();

        abort_unless($assignment->user_id === $user->id, 403, 'You can only update your own checklist items.');
        abort_unless($assignment->event->hasModuleEnabled('providers'), 403, "The 'providers' module is disabled for this event.");

        $validated = $request->validate([
            'is_prepared' => ['sometimes', 'boolean'],
        ]);

        $newState = array_key_exists('is_prepared', $validated)
            ? (bool) $validated['is_prepared']
            : ! $checklistItem->is_prepared;

        $checklistItem->update([
            'is_prepared' => $newState,
            'prepared_at' => $newState ? now() : null,
            'prepared_by' => $newState ? $user->id : null,
        ]);

        return response()->json(['data' => $checklistItem->fresh()]);
    }
}

