<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventProvider;
use App\Models\Provider;
use App\Models\ProviderChecklistItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class EventProviderController extends Controller
{
    public function index(Event $event): JsonResponse
    {
        Gate::authorize('view', $event);

        $assignments = $event->eventProviders()
            ->with(['provider', 'checklistItems'])
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $assignments]);
    }

    public function store(Request $request, Event $event): JsonResponse
    {
        Gate::authorize('update', $event);

        $validated = $request->validate([
            'provider_id' => ['required', 'integer', 'exists:providers,id'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'service_description' => ['nullable', 'string'],
            'agreed_cost' => ['nullable', 'numeric', 'min:0'],
            'advance_paid' => ['nullable', 'numeric', 'min:0'],
            'setup_at' => ['nullable', 'date'],
            'show_at' => ['nullable', 'date'],
            'teardown_at' => ['nullable', 'date'],
            'status' => ['nullable', Rule::in(['pending', 'confirmed', 'completed', 'cancelled'])],
            'notes' => ['nullable', 'string'],
        ]);

        $provider = Provider::findOrFail($validated['provider_id']);
        abort_unless($provider->organizer_id === $request->user()->id, 403, 'You do not own this provider.');

        $exists = EventProvider::where('event_id', $event->id)
            ->where('provider_id', $provider->id)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Provider is already assigned to this event.'], 422);
        }

        $assignment = EventProvider::create([
            'event_id' => $event->id,
            'provider_id' => $provider->id,
            'user_id' => $validated['user_id'] ?? $provider->user_id,
            'service_description' => $validated['service_description'] ?? null,
            'agreed_cost' => $validated['agreed_cost'] ?? 0,
            'advance_paid' => $validated['advance_paid'] ?? 0,
            'setup_at' => $validated['setup_at'] ?? null,
            'show_at' => $validated['show_at'] ?? null,
            'teardown_at' => $validated['teardown_at'] ?? null,
            'status' => $validated['status'] ?? 'pending',
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'data' => $assignment->load(['provider', 'checklistItems']),
        ], 201);
    }

    public function update(Request $request, Event $event, EventProvider $eventProvider): JsonResponse
    {
        Gate::authorize('update', $event);
        abort_unless($eventProvider->event_id === $event->id, 404);

        $validated = $request->validate([
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'service_description' => ['nullable', 'string'],
            'agreed_cost' => ['sometimes', 'numeric', 'min:0'],
            'advance_paid' => ['sometimes', 'numeric', 'min:0'],
            'setup_at' => ['nullable', 'date'],
            'show_at' => ['nullable', 'date'],
            'teardown_at' => ['nullable', 'date'],
            'status' => ['sometimes', Rule::in(['pending', 'confirmed', 'completed', 'cancelled'])],
            'notes' => ['nullable', 'string'],
        ]);

        $eventProvider->update($validated);

        return response()->json([
            'data' => $eventProvider->fresh()->load(['provider', 'checklistItems']),
        ]);
    }

    public function destroy(Event $event, EventProvider $eventProvider): JsonResponse
    {
        Gate::authorize('update', $event);
        abort_unless($eventProvider->event_id === $event->id, 404);

        $eventProvider->delete();

        return response()->json(['message' => 'Provider unassigned from event.']);
    }

    public function storeChecklistItem(Request $request, Event $event, EventProvider $eventProvider): JsonResponse
    {
        Gate::authorize('update', $event);
        abort_unless($eventProvider->event_id === $event->id, 404);

        $validated = $request->validate([
            'item_name' => ['required', 'string', 'max:255'],
            'quantity' => ['nullable', 'integer', 'min:1'],
            'notes' => ['nullable', 'string'],
        ]);

        $item = $eventProvider->checklistItems()->create([
            'item_name' => $validated['item_name'],
            'quantity' => $validated['quantity'] ?? 1,
            'is_prepared' => false,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json(['data' => $item], 201);
    }

    public function updateChecklistItem(
        Request $request,
        Event $event,
        EventProvider $eventProvider,
        ProviderChecklistItem $checklistItem
    ): JsonResponse {
        Gate::authorize('update', $event);
        abort_unless(
            $eventProvider->event_id === $event->id && $checklistItem->event_provider_id === $eventProvider->id,
            404
        );

        $validated = $request->validate([
            'item_name' => ['sometimes', 'required', 'string', 'max:255'],
            'quantity' => ['sometimes', 'integer', 'min:1'],
            'is_prepared' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string'],
        ]);

        if (array_key_exists('is_prepared', $validated)) {
            $validated['prepared_at'] = $validated['is_prepared'] ? now() : null;
            $validated['prepared_by'] = $validated['is_prepared'] ? $request->user()->id : null;
        }

        $checklistItem->update($validated);

        return response()->json(['data' => $checklistItem->fresh()]);
    }

    public function destroyChecklistItem(
        Event $event,
        EventProvider $eventProvider,
        ProviderChecklistItem $checklistItem
    ): JsonResponse {
        Gate::authorize('update', $event);
        abort_unless(
            $eventProvider->event_id === $event->id && $checklistItem->event_provider_id === $eventProvider->id,
            404
        );

        $checklistItem->delete();

        return response()->json(['message' => 'Checklist item deleted successfully.']);
    }
}

