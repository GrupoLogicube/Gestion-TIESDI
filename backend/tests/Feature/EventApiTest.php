<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventModule;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function createOrganizer(string $email = 'org@example.com'): User
    {
        $user = User::factory()->create(['email' => $email]);
        $user->assignRole('organizer');

        return $user;
    }

    public function test_organizer_can_crud_event_and_default_modules_are_seeded(): void
    {
        $organizer = $this->createOrganizer();

        // Store
        $createResponse = $this->actingAs($organizer, 'sanctum')
            ->postJson('/api/events', [
                'title' => 'Fiesta Aniversario',
                'description' => 'Evento corporativo',
                'location' => 'Salón Central',
                'starts_at' => '2026-12-15T19:00:00Z',
                'ends_at' => '2026-12-16T01:00:00Z',
                'status' => 'active',
            ]);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.title', 'Fiesta Aniversario')
            ->assertJsonPath('data.organizer_id', $organizer->id)
            ->assertJsonCount(count(EventModule::AVAILABLE_MODULES), 'data.modules');

        $eventId = $createResponse->json('data.id');

        foreach (EventModule::AVAILABLE_MODULES as $moduleKey) {
            $this->assertDatabaseHas('event_modules', [
                'event_id' => $eventId,
                'module_key' => $moduleKey,
                'is_enabled' => true,
            ]);
        }

        // Index
        $this->actingAs($organizer, 'sanctum')
            ->getJson('/api/events')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        // Show
        $this->actingAs($organizer, 'sanctum')
            ->getJson("/api/events/{$eventId}")
            ->assertOk()
            ->assertJsonPath('data.id', $eventId);

        // Update
        $this->actingAs($organizer, 'sanctum')
            ->putJson("/api/events/{$eventId}", [
                'title' => 'Fiesta Aniversario VIP',
                'status' => 'completed',
            ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Fiesta Aniversario VIP')
            ->assertJsonPath('data.status', 'completed');

        // Destroy (soft delete)
        $this->actingAs($organizer, 'sanctum')
            ->deleteJson("/api/events/{$eventId}")
            ->assertOk();

        $this->assertSoftDeleted('events', ['id' => $eventId]);
    }

    public function test_event_policy_blocks_other_users_and_providers(): void
    {
        $owner = $this->createOrganizer('owner@example.com');
        $otherOrganizer = $this->createOrganizer('other@example.com');

        $providerUser = User::factory()->create(['email' => 'vendor@example.com']);
        $providerUser->assignRole('provider');

        $event = Event::create([
            'organizer_id' => $owner->id,
            'title' => 'Evento Privado',
            'starts_at' => now()->addDays(10),
            'status' => 'draft',
        ]);

        // Another organizer cannot view, update, delete or configure modules
        $this->actingAs($otherOrganizer, 'sanctum')
            ->getJson("/api/events/{$event->id}")
            ->assertForbidden();

        $this->actingAs($otherOrganizer, 'sanctum')
            ->putJson("/api/events/{$event->id}", ['title' => 'Hackeado'])
            ->assertForbidden();

        $this->actingAs($otherOrganizer, 'sanctum')
            ->deleteJson("/api/events/{$event->id}")
            ->assertForbidden();

        $this->actingAs($otherOrganizer, 'sanctum')
            ->putJson("/api/events/{$event->id}/modules", [
                'modules' => [['module_key' => 'tasks', 'is_enabled' => false]],
            ])
            ->assertForbidden();

        // Provider role cannot create events
        $this->actingAs($providerUser, 'sanctum')
            ->postJson('/api/events', [
                'title' => 'Evento No Permitido',
                'starts_at' => now()->addDays(5)->toISOString(),
            ])
            ->assertForbidden();
    }

    public function test_organizer_can_toggle_event_modules(): void
    {
        $organizer = $this->createOrganizer();

        $createResponse = $this->actingAs($organizer, 'sanctum')
            ->postJson('/api/events', [
                'title' => 'Boda Modular',
                'starts_at' => '2026-12-20T18:00:00Z',
            ])
            ->assertCreated();

        $eventId = $createResponse->json('data.id');

        $updateModulesResponse = $this->actingAs($organizer, 'sanctum')
            ->putJson("/api/events/{$eventId}/modules", [
                'modules' => [
                    ['module_key' => 'inventory', 'is_enabled' => false],
                    ['module_key' => 'tasks', 'is_enabled' => false, 'settings' => ['layout' => 'list']],
                ],
            ]);

        $updateModulesResponse->assertOk();

        $this->assertDatabaseHas('event_modules', [
            'event_id' => $eventId,
            'module_key' => 'inventory',
            'is_enabled' => false,
        ]);

        $this->assertDatabaseHas('event_modules', [
            'event_id' => $eventId,
            'module_key' => 'tasks',
            'is_enabled' => false,
        ]);

        // Invalid module key rejected
        $this->actingAs($organizer, 'sanctum')
            ->putJson("/api/events/{$eventId}/modules", [
                'modules' => [
                    ['module_key' => 'unknown_module', 'is_enabled' => true],
                ],
            ])
            ->assertUnprocessable();
    }
}

