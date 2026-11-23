<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            // Eventos y configuración modular
            'events.view',
            'events.create',
            'events.update',
            'events.delete',
            'events.configure_modules',

            // Proveedores
            'providers.manage',
            'providers.view_assigned',
            'providers.toggle_checklist',

            // Invitados (RSVP)
            'guests.manage',

            // Inventario
            'inventory.manage',
            'inventory.checkin',

            // Módulos complementarios
            'schedule.manage',
            'schedule.view',
            'budget.manage',
            'tasks.manage',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $organizerRole = Role::firstOrCreate(['name' => 'organizer', 'guard_name' => 'web']);
        $organizerRole->syncPermissions($permissions);

        $providerRole = Role::firstOrCreate(['name' => 'provider', 'guard_name' => 'web']);
        $providerRole->syncPermissions([
            'providers.view_assigned',
            'providers.toggle_checklist',
            'schedule.view',
        ]);
    }
}

