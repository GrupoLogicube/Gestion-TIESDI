<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GuestMagicLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RsvpController extends Controller
{
    public function show(string $token): JsonResponse
    {
        $magicLink = $this->resolveValidMagicLink($token);
        $guest = $magicLink->guest;
        $event = $guest->event;

        $magicLink->increment('access_count');
        $magicLink->update(['last_accessed_at' => now()]);

        return response()->json([
            'data' => [
                'event' => [
                    'id' => $event->id,
                    'title' => $event->title,
                    'description' => $event->description,
                    'location' => $event->location,
                    'location_url' => $event->location_url,
                    'starts_at' => $event->starts_at?->toISOString(),
                    'ends_at' => $event->ends_at?->toISOString(),
                ],
                'guest' => [
                    'id' => $guest->id,
                    'name' => $guest->name,
                    'passes_count' => $guest->passes_count,
                    'confirmed_passes' => $guest->confirmed_passes,
                    'rsvp_status' => $guest->rsvp_status,
                    'notes' => $guest->notes,
                    'responded_at' => $guest->responded_at?->toISOString(),
                ],
            ],
        ]);
    }

    public function confirm(Request $request, string $token): JsonResponse
    {
        $magicLink = $this->resolveValidMagicLink($token);
        $guest = $magicLink->guest;

        $validated = $request->validate([
            'rsvp_status' => ['required', Rule::in(['confirmed', 'declined'])],
            'confirmed_passes' => ['nullable', 'integer', 'min:0', 'max:'.$guest->passes_count],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $confirmedPasses = $validated['rsvp_status'] === 'declined'
            ? 0
            : ($validated['confirmed_passes'] ?? $guest->passes_count);

        $guest->update([
            'rsvp_status' => $validated['rsvp_status'],
            'confirmed_passes' => $confirmedPasses,
            'notes' => $validated['notes'] ?? $guest->notes,
            'responded_at' => now(),
        ]);

        return response()->json([
            'message' => 'RSVP updated successfully.',
            'data' => [
                'id' => $guest->id,
                'name' => $guest->name,
                'passes_count' => $guest->passes_count,
                'confirmed_passes' => $guest->confirmed_passes,
                'rsvp_status' => $guest->rsvp_status,
                'notes' => $guest->notes,
                'responded_at' => $guest->responded_at?->toISOString(),
            ],
        ]);
    }

    private function resolveValidMagicLink(string $token): GuestMagicLink
    {
        $tokenHash = hash('sha256', $token);

        $magicLink = GuestMagicLink::query()
            ->where('token_hash', $tokenHash)
            ->with('guest.event')
            ->first();

        abort_unless($magicLink !== null, 404, 'Invalid RSVP link.');
        abort_if($magicLink->revoked_at !== null, 410, 'This RSVP link has been revoked.');
        abort_if($magicLink->expires_at !== null && $magicLink->expires_at->isPast(), 410, 'This RSVP link has expired.');

        $event = $magicLink->guest?->event;
        abort_unless($event !== null, 404, 'Event not found.');
        abort_unless($event->hasModuleEnabled('rsvp'), 403, "The 'rsvp' module is disabled for this event.");

        return $magicLink;
    }
}

