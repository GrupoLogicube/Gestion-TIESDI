<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetItem;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class BudgetItemController extends Controller
{
    public function index(Event $event): JsonResponse
    {
        Gate::authorize('view', $event);

        $items = $event->budgetItems()
            ->orderBy('category')
            ->orderBy('title')
            ->get();

        return response()->json([
            'data' => $items,
            'summary' => [
                'total_estimated' => (float) $items->sum('estimated_amount'),
                'total_actual' => (float) $items->sum('actual_amount'),
                'total_paid' => (float) $items->sum('paid_amount'),
            ],
        ]);
    }

    public function store(Request $request, Event $event): JsonResponse
    {
        Gate::authorize('update', $event);

        $validated = $request->validate([
            'event_provider_id' => ['nullable', 'integer', 'exists:event_providers,id'],
            'category' => ['required', 'string', 'max:100'],
            'title' => ['required', 'string', 'max:255'],
            'estimated_amount' => ['required', 'numeric', 'min:0'],
            'actual_amount' => ['nullable', 'numeric', 'min:0'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', Rule::in(['planned', 'partial', 'paid'])],
            'notes' => ['nullable', 'string'],
        ]);

        if (! empty($validated['event_provider_id'])) {
            abort_unless(
                $event->eventProviders()->where('id', $validated['event_provider_id'])->exists(),
                422,
                'Event provider does not belong to this event.'
            );
        }

        $item = $event->budgetItems()->create([
            'event_provider_id' => $validated['event_provider_id'] ?? null,
            'category' => $validated['category'],
            'title' => $validated['title'],
            'estimated_amount' => $validated['estimated_amount'],
            'actual_amount' => $validated['actual_amount'] ?? 0,
            'paid_amount' => $validated['paid_amount'] ?? 0,
            'status' => $validated['status'] ?? 'planned',
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json(['data' => $item], 201);
    }

    public function show(Event $event, BudgetItem $budgetItem): JsonResponse
    {
        Gate::authorize('view', $event);
        abort_unless($budgetItem->event_id === $event->id, 404);

        return response()->json(['data' => $budgetItem]);
    }

    public function update(Request $request, Event $event, BudgetItem $budgetItem): JsonResponse
    {
        Gate::authorize('update', $event);
        abort_unless($budgetItem->event_id === $event->id, 404);

        $validated = $request->validate([
            'event_provider_id' => ['nullable', 'integer', 'exists:event_providers,id'],
            'category' => ['sometimes', 'required', 'string', 'max:100'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'estimated_amount' => ['sometimes', 'numeric', 'min:0'],
            'actual_amount' => ['sometimes', 'numeric', 'min:0'],
            'paid_amount' => ['sometimes', 'numeric', 'min:0'],
            'status' => ['sometimes', Rule::in(['planned', 'partial', 'paid'])],
            'notes' => ['nullable', 'string'],
        ]);

        $budgetItem->update($validated);

        return response()->json(['data' => $budgetItem->fresh()]);
    }

    public function destroy(Event $event, BudgetItem $budgetItem): JsonResponse
    {
        Gate::authorize('update', $event);
        abort_unless($budgetItem->event_id === $event->id, 404);

        $budgetItem->delete();

        return response()->json(['message' => 'Budget item deleted successfully.']);
    }
}

