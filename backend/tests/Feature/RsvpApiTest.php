<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventModule;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RsvpApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function createEventWithModules(User $organizer, bool $rsvpEnabled = true): Event
    {
        $event = Event::create([
            'organizer_id' => $organizer->id,
            'title' => 'Boda Real',
            'location' => 'Jardín Botánico',
            'starts_at' => now()->addDays(20),
            'status' => 'active',
        ]);

        foreach (EventModule::AVAILABLE_MODULES as $moduleKey) {
            EventModule::create([
                'event_id' => $event->id,
                'module_key' => $moduleKey,
                'is_enabled' => $moduleKey === 'rsvp' ? $rsvpEnabled : true,
            ]);
        }

        return $event;
    }

    public function test_organizer_can_manage_guests_and_guest_can_confirm_via_public_magic_link(): void
    {
        $organizer = User::factory()->create();
        $organizer->assignRole('organizer');

        $event = $this->createEventWithModules($organizer, true);

        // Create guest
        $guestResp = $this->actingAs($organizer, 'sanctum')
            ->postJson("/api/events/{$event->id}/guests", [
                'name' => 'Carlos Invitado',
                'email' => 'carlos@example.com',
                'passes_count' => 3,
            ])
            ->assertCreated();

        $guestId = $guestResp->json('data.id');

        // Generate magic link
        $linkResp = $this->actingAs($organizer, 'sanctum')
            ->postJson("/api/events/{$event->id}/guests/{$guestId}/magic-link")
            ->assertCreated()
            ->assertJsonStructure(['data' => ['id', 'guest_id', 'token', 'rsvp_url']]);

        $token = $linkResp->json('data.token');

        // Public GET without authentication
        $this->getJson("/api/rsvp/{$token}")
            ->assertOk()
            ->assertJsonPath('data.event.title', 'Boda Real')
            ->assertJsonPath('data.guest.name', 'Carlos Invitado')
            ->assertJsonPath('data.guest.rsvp_status', 'pending');

        // Public POST confirm without authentication
        $this->postJson("/api/rsvp/{$token}/confirm", [
            'rsvp_status' => 'confirmed',
            'confirmed_passes' => 2,
            'notes' => '1 menú vegetariano',
        ])
            ->assertOk()
            ->assertJsonPath('data.rsvp_status', 'confirmed')
            ->assertJsonPath('data.confirmed_passes', 2)
            ->assertJsonPath('data.notes', '1 menú vegetariano');

        // Invalid token returns 404
        $this->getJson('/api/rsvp/invalid-token-123')
            ->assertNotFound();
    }

    public function test_disabled_rsvp_module_blocks_organizer_and_public_magic_link(): void
    {
        $organizer = User::factory()->create();
        $organizer->assignRole('organizer');

        $event = $this->createEventWithModules($organizer, true);

        $guest = $event->guests()->create([
            'name' => 'Laura',
            'passes_count' => 1,
        ]);

        $linkResp = $this->actingAs($organizer, 'sanctum')
            ->postJson("/api/events/{$event->id}/guests/{$guest->id}/magic-link")
            ->assertCreated();

        $token = $linkResp->json('data.token');

        // Turn off rsvp module
        $event->modules()->where('module_key', 'rsvp')->update(['is_enabled' => false]);

        $this->actingAs($organizer, 'sanctum')
            ->getJson("/api/events/{$event->id}/guests")
            ->assertForbidden();

        $this->getJson("/api/rsvp/{$token}")
            ->assertForbidden();
    }
}

