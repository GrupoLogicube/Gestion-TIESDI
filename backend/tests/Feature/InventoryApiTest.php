<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventModule;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function createEvent(User $organizer, array $disabledModules = []): Event
    {
        $event = Event::create([
            'organizer_id' => $organizer->id,
            'title' => 'Concierto Privado',
            'starts_at' => now()->addDays(7),
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

    public function test_organizer_can_manage_inventory_and_perform_realtime_checkin(): void
    {
        $organizer = User::factory()->create();
        $organizer->assignRole('organizer');

        $event = $this->createEvent($organizer);

        $itemResp = $this->actingAs($organizer, 'sanctum')
            ->postJson("/api/events/{$event->id}/inventory", [
                'name' => 'Cajas de Agua',
                'category' => 'Bebidas',
                'unit' => 'cajas',
                'planned_qty' => 10,
            ])
            ->assertCreated();

        $itemId = $itemResp->json('data.id');

        // Partial check-in
        $this->actingAs($organizer, 'sanctum')
            ->patchJson("/api/events/{$event->id}/inventory/{$itemId}/check-in", [
                'actual_qty' => 6,
            ])
            ->assertOk()
            ->assertJsonPath('data.actual_qty', 6)
            ->assertJsonPath('data.status', 'partial');

        // Full check-in
        $this->actingAs($organizer, 'sanctum')
            ->patchJson("/api/events/{$event->id}/inventory/{$itemId}/check-in", [
                'actual_qty' => 10,
            ])
            ->assertOk()
            ->assertJsonPath('data.actual_qty', 10)
            ->assertJsonPath('data.status', 'checked_in');
    }

    public function test_complementary_modules_crud_and_module_middleware_enforcement(): void
    {
        $organizer = User::factory()->create();
        $organizer->assignRole('organizer');

        $event = $this->createEvent($organizer, ['inventory']);

        // Inventory disabled -> 403
        $this->actingAs($organizer, 'sanctum')
            ->getJson("/api/events/{$event->id}/inventory")
            ->assertForbidden();

        // Schedule enabled -> 201
        $this->actingAs($organizer, 'sanctum')
            ->postJson("/api/events/{$event->id}/schedule", [
                'title' => 'Apertura de puertas',
                'starts_at' => now()->addDays(7)->toISOString(),
            ])
            ->assertCreated();

        // Budget enabled -> 201 & summary
        $this->actingAs($organizer, 'sanctum')
            ->postJson("/api/events/{$event->id}/budget", [
                'category' => 'Decoración',
                'title' => 'Flores',
                'estimated_amount' => 500,
                'actual_amount' => 450,
                'paid_amount' => 200,
            ])
            ->assertCreated();

        $this->actingAs($organizer, 'sanctum')
            ->getJson("/api/events/{$event->id}/budget")
            ->assertOk()
            ->assertJsonPath('summary.total_estimated', 500);

        // Tasks enabled -> 201
        $this->actingAs($organizer, 'sanctum')
            ->postJson("/api/events/{$event->id}/tasks", [
                'title' => 'Confirmar catering',
                'status' => 'todo',
                'priority' => 'high',
            ])
            ->assertCreated();
    }
}

