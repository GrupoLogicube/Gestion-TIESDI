<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventModule;
use App\Models\Provider;
use App\Models\ScheduleItem;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProvidersApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function createEventForOrganizer(User $organizer, array $disabledModules = []): Event
    {
        $event = Event::create([
            'organizer_id' => $organizer->id,
            'title' => 'Fiesta Gala',
            'starts_at' => now()->addDays(10),
            'status' => 'active',
        ]);

        foreach (EventModule::AVAILABLE_MODULES as $moduleKey) {
            EventModule::create([
                'event_id' => $event->id,
                'module_key' => $moduleKey,
                'is_enabled' => ! in_array($moduleKey, $disabledModules, true),
            ]);
        }

        return $event;
    }

    public function test_organizer_can_manage_providers_and_assign_to_event(): void
    {
        $organizer = User::factory()->create();
        $organizer->assignRole('organizer');

        $providerUser = User::factory()->create(['email' => 'dj@example.com']);
        $providerUser->assignRole('provider');

        $event = $this->createEventForOrganizer($organizer);

        // Create global provider
        $providerResp = $this->actingAs($organizer, 'sanctum')
            ->postJson('/api/providers', [
                'user_id' => $providerUser->id,
                'business_name' => 'DJ Master',
                'category' => 'Música',
                'email' => 'dj@example.com',
            ])
            ->assertCreated();

        $providerId = $providerResp->json('data.id');

        // Assign to event
        $assignResp = $this->actingAs($organizer, 'sanctum')
            ->postJson("/api/events/{$event->id}/providers", [
                'provider_id' => $providerId,
                'service_description' => 'Música y luces',
                'agreed_cost' => 1200,
                'advance_paid' => 400,
                'setup_at' => now()->addDays(10)->toISOString(),
            ])
            ->assertCreated();

        $assignmentId = $assignResp->json('data.id');

        // Add checklist item
        $itemResp = $this->actingAs($organizer, 'sanctum')
            ->postJson("/api/events/{$event->id}/providers/{$assignmentId}/checklist", [
                'item_name' => 'Parlantes JBL',
                'quantity' => 2,
            ])
            ->assertCreated();

        $this->assertDatabaseHas('provider_checklist_items', [
            'id' => $itemResp->json('data.id'),
            'item_name' => 'Parlantes JBL',
            'quantity' => 2,
            'is_prepared' => false,
        ]);
    }

    public function test_provider_can_only_view_assigned_events_schedule_and_toggle_own_checklist(): void
    {
        $organizer = User::factory()->create();
        $organizer->assignRole('organizer');

        $providerUserA = User::factory()->create(['email' => 'a@vendor.com']);
        $providerUserA->assignRole('provider');

        $providerUserB = User::factory()->create(['email' => 'b@vendor.com']);
        $providerUserB->assignRole('provider');

        $event = $this->createEventForOrganizer($organizer);

        $providerA = Provider::create([
            'organizer_id' => $organizer->id,
            'user_id' => $providerUserA->id,
            'business_name' => 'Sonido A',
            'category' => 'Audio',
        ]);

        $assignmentA = $event->eventProviders()->create([
            'provider_id' => $providerA->id,
            'user_id' => $providerUserA->id,
            'setup_at' => now()->addDays(10),
        ]);

        $checklistItemA = $assignmentA->checklistItems()->create([
            'item_name' => 'Consola DJ',
            'quantity' => 1,
            'is_prepared' => false,
        ]);

        ScheduleItem::create([
            'event_id' => $event->id,
            'event_provider_id' => $assignmentA->id,
            'title' => 'Set-up Audio',
            'starts_at' => now()->addDays(10),
        ]);

        // Provider A sees assigned event & schedule
        $this->actingAs($providerUserA, 'sanctum')
            ->getJson('/api/provider/events')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($providerUserA, 'sanctum')
            ->getJson("/api/provider/events/{$event->id}/schedule")
            ->assertOk()
            ->assertJsonPath('data.schedule.0.is_mine', true);

        // Provider A can toggle own checklist item (and cannot alter item_name/quantity)
        $this->actingAs($providerUserA, 'sanctum')
            ->patchJson("/api/provider/checklist/{$checklistItemA->id}/toggle", [
                'is_prepared' => true,
                'item_name' => 'Hackeado',
                'quantity' => 999,
            ])
            ->assertOk()
            ->assertJsonPath('data.is_prepared', true)
            ->assertJsonPath('data.item_name', 'Consola DJ')
            ->assertJsonPath('data.quantity', 1);

        // Provider B is blocked from Provider A's event, schedule, and checklist
        $this->actingAs($providerUserB, 'sanctum')
            ->getJson("/api/provider/events/{$event->id}")
            ->assertForbidden();

        $this->actingAs($providerUserB, 'sanctum')
            ->getJson("/api/provider/events/{$event->id}/schedule")
            ->assertForbidden();

        $this->actingAs($providerUserB, 'sanctum')
            ->patchJson("/api/provider/checklist/{$checklistItemA->id}/toggle")
            ->assertForbidden();
    }

    public function test_disabled_providers_module_blocks_requests_with_403(): void
    {
        $organizer = User::factory()->create();
        $organizer->assignRole('organizer');

        $event = $this->createEventForOrganizer($organizer, ['providers']);

        $this->actingAs($organizer, 'sanctum')
            ->getJson("/api/events/{$event->id}/providers")
            ->assertForbidden();
    }
}

