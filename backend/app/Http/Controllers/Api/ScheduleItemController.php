<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\ScheduleItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ScheduleItemController extends Controller
{
    public function index(Event $event): JsonResponse
    {
        Gate::authorize('view', $event);

        $items = $event->scheduleItems()
            ->with('eventProvider.provider')
            ->orderBy('starts_at')
            ->orderBy('sort_order')
            ->get();

        return response()->json(['data' => $items]);
    }

    public function store(Request $request, Event $event): JsonResponse
    {
        Gate::authorize('update', $event);

        $validated = $request->validate([
            'event_provider_id' => ['nullable', 'integer', 'exists:event_providers,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'location_area' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        if (! empty($validated['event_provider_id'])) {
            abort_unless(
                $event->eventProviders()->where('id', $validated['event_provider_id'])->exists(),
                422,
                'Event provider does not belong to this event.'
            );
        }

        $item = $event->scheduleItems()->create([
            'event_provider_id' => $validated['event_provider_id'] ?? null,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'starts_at' => $validated['starts_at'],
            'ends_at' => $validated['ends_at'] ?? null,
            'location_area' => $validated['location_area'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return response()->json(['data' => $item], 201);
    }

    public function show(Event $event, ScheduleItem $scheduleItem): JsonResponse
    {
        Gate::authorize('view', $event);
        abort_unless($scheduleItem->event_id === $event->id, 404);

        return response()->json(['data' => $scheduleItem]);
    }

    public function update(Request $request, Event $event, ScheduleItem $scheduleItem): JsonResponse
    {
        Gate::authorize('update', $event);
        abort_unless($scheduleItem->event_id === $event->id, 404);

        $validated = $request->validate([
            'event_provider_id' => ['nullable', 'integer', 'exists:event_providers,id'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['sometimes', 'required', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'location_area' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $scheduleItem->update($validated);

        return response()->json(['data' => $scheduleItem->fresh()]);
    }

    public function destroy(Event $event, ScheduleItem $scheduleItem): JsonResponse
    {
        Gate::authorize('update', $event);
        abort_unless($scheduleItem->event_id === $event->id, 404);

        $scheduleItem->delete();

        return response()->json(['message' => 'Schedule item deleted successfully.']);
    }
}

