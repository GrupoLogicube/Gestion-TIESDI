<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class TaskController extends Controller
{
    public function index(Event $event): JsonResponse
    {
        Gate::authorize('view', $event);

        $tasks = $event->tasks()
            ->orderBy('sort_order')
            ->orderBy('due_at')
            ->get();

        return response()->json(['data' => $tasks]);
    }

    public function store(Request $request, Event $event): JsonResponse
    {
        Gate::authorize('update', $event);

        $validated = $request->validate([
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['todo', 'in_progress', 'done'])],
            'priority' => ['nullable', Rule::in(['low', 'medium', 'high'])],
            'due_at' => ['nullable', 'date'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $task = $event->tasks()->create([
            'assigned_to' => $validated['assigned_to'] ?? null,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'todo',
            'priority' => $validated['priority'] ?? 'medium',
            'due_at' => $validated['due_at'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return response()->json(['data' => $task], 201);
    }

    public function show(Event $event, Task $task): JsonResponse
    {
        Gate::authorize('view', $event);
        abort_unless($task->event_id === $event->id, 404);

        return response()->json(['data' => $task]);
    }

    public function update(Request $request, Event $event, Task $task): JsonResponse
    {
        Gate::authorize('update', $event);
        abort_unless($task->event_id === $event->id, 404);

        $validated = $request->validate([
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::in(['todo', 'in_progress', 'done'])],
            'priority' => ['sometimes', Rule::in(['low', 'medium', 'high'])],
            'due_at' => ['nullable', 'date'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $task->update($validated);

        return response()->json(['data' => $task->fresh()]);
    }

    public function destroy(Event $event, Task $task): JsonResponse
    {
        Gate::authorize('update', $event);
        abort_unless($task->event_id === $event->id, 404);

        $task->delete();

        return response()->json(['message' => 'Task deleted successfully.']);
    }
}

