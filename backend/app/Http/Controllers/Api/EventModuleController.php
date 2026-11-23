<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventModuleResource;
use App\Models\Event;
use App\Models\EventModule;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class EventModuleController extends Controller
{
    public function update(Request $request, Event $event): AnonymousResourceCollection
    {
        Gate::authorize('configureModules', $event);

        $validated = $request->validate([
            'modules' => ['required', 'array', 'min:1'],
            'modules.*.module_key' => ['required', 'string', Rule::in(EventModule::AVAILABLE_MODULES)],
            'modules.*.is_enabled' => ['required', 'boolean'],
            'modules.*.settings' => ['nullable', 'array'],
        ]);

        DB::transaction(function () use ($event, $validated) {
            foreach ($validated['modules'] as $moduleData) {
                EventModule::updateOrCreate(
                    [
                        'event_id' => $event->id,
                        'module_key' => $moduleData['module_key'],
                    ],
                    [
                        'is_enabled' => (bool) $moduleData['is_enabled'],
                        'settings' => $moduleData['settings'] ?? null,
                    ]
                );
            }
        });

        return EventModuleResource::collection(
            $event->modules()->orderBy('id')->get()
        );
    }
}

