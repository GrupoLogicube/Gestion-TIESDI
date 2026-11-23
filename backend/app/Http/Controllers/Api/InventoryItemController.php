<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\InventoryItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class InventoryItemController extends Controller
{
    public function index(Event $event): JsonResponse
    {
        Gate::authorize('view', $event);

        $items = $event->inventoryItems()
            ->orderBy('category')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $items]);
    }

    public function store(Request $request, Event $event): JsonResponse
    {
        Gate::authorize('update', $event);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'unit' => ['nullable', 'string', 'max:50'],
            'planned_qty' => ['required', 'integer', 'min:0'],
            'actual_qty' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', Rule::in(['pending', 'checked_in', 'checked_out', 'partial'])],
            'notes' => ['nullable', 'string'],
        ]);

        $item = $event->inventoryItems()->create([
            'name' => $validated['name'],
            'category' => $validated['category'] ?? null,
            'unit' => $validated['unit'] ?? 'unit',
            'planned_qty' => $validated['planned_qty'],
            'actual_qty' => $validated['actual_qty'] ?? 0,
            'status' => $validated['status'] ?? 'pending',
            'last_updated_by' => $request->user()->id,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json(['data' => $item], 201);
    }

    public function show(Event $event, InventoryItem $inventoryItem): JsonResponse
    {
        Gate::authorize('view', $event);
        abort_unless($inventoryItem->event_id === $event->id, 404);

        return response()->json(['data' => $inventoryItem]);
    }

    public function update(Request $request, Event $event, InventoryItem $inventoryItem): JsonResponse
    {
        Gate::authorize('update', $event);
        abort_unless($inventoryItem->event_id === $event->id, 404);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'unit' => ['sometimes', 'string', 'max:50'],
            'planned_qty' => ['sometimes', 'integer', 'min:0'],
            'actual_qty' => ['sometimes', 'integer', 'min:0'],
            'status' => ['sometimes', Rule::in(['pending', 'checked_in', 'checked_out', 'partial'])],
            'notes' => ['nullable', 'string'],
        ]);

        $validated['last_updated_by'] = $request->user()->id;

        $inventoryItem->update($validated);

        return response()->json(['data' => $inventoryItem->fresh()]);
    }

    public function checkIn(Request $request, Event $event, InventoryItem $inventoryItem): JsonResponse
    {
        Gate::authorize('update', $event);
        abort_unless($inventoryItem->event_id === $event->id, 404);

        $validated = $request->validate([
            'actual_qty' => ['required', 'integer', 'min:0'],
            'status' => ['nullable', Rule::in(['pending', 'checked_in', 'checked_out', 'partial'])],
            'notes' => ['nullable', 'string'],
        ]);

        $actualQty = (int) $validated['actual_qty'];
        $status = $validated['status'] ?? match (true) {
            $actualQty === 0 => 'pending',
            $actualQty < $inventoryItem->planned_qty => 'partial',
            default => 'checked_in',
        };

        $inventoryItem->update([
            'actual_qty' => $actualQty,
            'status' => $status,
            'checked_in_at' => $status === 'checked_in' || $status === 'partial' ? now() : $inventoryItem->checked_in_at,
            'checked_out_at' => $status === 'checked_out' ? now() : $inventoryItem->checked_out_at,
            'last_updated_by' => $request->user()->id,
            'notes' => $validated['notes'] ?? $inventoryItem->notes,
        ]);

        return response()->json(['data' => $inventoryItem->fresh()]);
    }

    public function destroy(Event $event, InventoryItem $inventoryItem): JsonResponse
    {
        Gate::authorize('update', $event);
        abort_unless($inventoryItem->event_id === $event->id, 404);

        $inventoryItem->delete();

        return response()->json(['message' => 'Inventory item deleted successfully.']);
    }
}

