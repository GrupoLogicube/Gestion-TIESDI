<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Models\EventModule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class EventController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Event::class);

        $events = Event::query()
            ->where('organizer_id', $request->user()->id)
            ->with('modules')
            ->orderBy('starts_at')
            ->get();

        return EventResource::collection($events);
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('create', Event::class);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:255'],
            'location_url' => ['nullable', 'url', 'max:500'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'status' => ['nullable', Rule::in(['draft', 'active', 'completed', 'cancelled'])],
            'modules' => ['nullable', 'array'],
            'modules.*.module_key' => ['required', 'string', Rule::in(EventModule::AVAILABLE_MODULES)],
            'modules.*.is_enabled' => ['required', 'boolean'],
            'modules.*.settings' => ['nullable', 'array'],
        ]);

        $event = DB::transaction(function () use ($request, $validated) {
            $event = Event::create([
                'organizer_id' => $request->user()->id,
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'location' => $validated['location'] ?? null,
                'location_url' => $validated['location_url'] ?? null,
                'starts_at' => $validated['starts_at'],
                'ends_at' => $validated['ends_at'] ?? null,
                'status' => $validated['status'] ?? 'draft',
            ]);

            $overrides = collect($validated['modules'] ?? [])->keyBy('module_key');

            foreach (EventModule::AVAILABLE_MODULES as $moduleKey) {
                $override = $overrides->get($moduleKey);

                EventModule::create([
                    'event_id' => $event->id,
                    'module_key' => $moduleKey,
                    'is_enabled' => $override ? (bool) $override['is_enabled'] : true,
                    'settings' => $override['settings'] ?? null,
                ]);
            }

            return $event->load('modules');
        });

        return (new EventResource($event))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Event $event): EventResource
    {
        Gate::authorize('view', $event);

        return new EventResource($event->load('modules'));
    }

    public function update(Request $request, Event $event): EventResource
    {
        Gate::authorize('update', $event);

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:255'],
            'location_url' => ['nullable', 'url', 'max:500'],
            'starts_at' => ['sometimes', 'required', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'status' => ['sometimes', Rule::in(['draft', 'active', 'completed', 'cancelled'])],
        ]);

        $event->update($validated);

        return new EventResource($event->load('modules'));
    }

    public function destroy(Event $event): JsonResponse
    {
        Gate::authorize('delete', $event);

        $event->delete();

        return response()->json([
            'message' => 'Event deleted successfully.',
        ]);
    }
}

