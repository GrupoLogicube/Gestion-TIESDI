<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Guest;
use App\Models\GuestMagicLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class GuestController extends Controller
{
    public function index(Event $event): JsonResponse
    {
        Gate::authorize('view', $event);

        $guests = $event->guests()
            ->with(['magicLinks' => fn ($q) => $q->whereNull('revoked_at')->latest()])
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $guests]);
    }

    public function store(Request $request, Event $event): JsonResponse
    {
        Gate::authorize('update', $event);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'passes_count' => ['nullable', 'integer', 'min:1', 'max:50'],
            'notes' => ['nullable', 'string'],
        ]);

        $guest = $event->guests()->create([
            'name' => $validated['name'],
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'passes_count' => $validated['passes_count'] ?? 1,
            'confirmed_passes' => 0,
            'rsvp_status' => 'pending',
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json(['data' => $guest], 201);
    }

    public function show(Event $event, Guest $guest): JsonResponse
    {
        Gate::authorize('view', $event);
        abort_unless($guest->event_id === $event->id, 404);

        return response()->json(['data' => $guest]);
    }

    public function update(Request $request, Event $event, Guest $guest): JsonResponse
    {
        Gate::authorize('update', $event);
        abort_unless($guest->event_id === $event->id, 404);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'passes_count' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'confirmed_passes' => ['sometimes', 'integer', 'min:0'],
            'rsvp_status' => ['sometimes', Rule::in(['pending', 'confirmed', 'declined'])],
            'notes' => ['nullable', 'string'],
        ]);

        $guest->update($validated);

        return response()->json(['data' => $guest->fresh()]);
    }

    public function destroy(Event $event, Guest $guest): JsonResponse
    {
        Gate::authorize('update', $event);
        abort_unless($guest->event_id === $event->id, 404);

        $guest->delete();

        return response()->json(['message' => 'Guest deleted successfully.']);
    }

    public function generateMagicLink(Request $request, Event $event, Guest $guest): JsonResponse
    {
        Gate::authorize('update', $event);
        abort_unless($guest->event_id === $event->id, 404);

        $validated = $request->validate([
            'expires_at' => ['nullable', 'date', 'after:now'],
        ]);

        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);

        $magicLink = DB::transaction(function () use ($guest, $rawToken, $tokenHash, $validated) {
            $guest->magicLinks()->whereNull('revoked_at')->update(['revoked_at' => now()]);

            return GuestMagicLink::create([
                'guest_id' => $guest->id,
                'token_hash' => $tokenHash,
                'token_prefix' => substr($rawToken, 0, 12),
                'expires_at' => $validated['expires_at'] ?? null,
            ]);
        });

        return response()->json([
            'data' => [
                'id' => $magicLink->id,
                'guest_id' => $guest->id,
                'token' => $rawToken,
                'rsvp_url' => url("/api/rsvp/{$rawToken}"),
                'expires_at' => $magicLink->expires_at?->toISOString(),
            ],
        ], 201);
    }
}

