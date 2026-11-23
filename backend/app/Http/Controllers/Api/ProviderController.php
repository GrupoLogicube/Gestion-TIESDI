<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Provider;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ProviderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Provider::class);

        $providers = Provider::query()
            ->where('organizer_id', $request->user()->id)
            ->orderBy('business_name')
            ->get();

        return response()->json(['data' => $providers]);
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('create', Provider::class);

        $validated = $request->validate([
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'business_name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ]);

        if (! empty($validated['user_id'])) {
            $linkedUser = User::find($validated['user_id']);
            if ($linkedUser && ! $linkedUser->hasAnyRole(['organizer', 'provider'])) {
                $linkedUser->assignRole('provider');
            }
        }

        $provider = Provider::create([
            ...$validated,
            'organizer_id' => $request->user()->id,
        ]);

        return response()->json(['data' => $provider], 201);
    }

    public function show(Provider $provider): JsonResponse
    {
        Gate::authorize('view', $provider);

        return response()->json(['data' => $provider]);
    }

    public function update(Request $request, Provider $provider): JsonResponse
    {
        Gate::authorize('update', $provider);

        $validated = $request->validate([
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'business_name' => ['sometimes', 'required', 'string', 'max:255'],
            'category' => ['sometimes', 'required', 'string', 'max:100'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ]);

        $provider->update($validated);

        return response()->json(['data' => $provider->fresh()]);
    }

    public function destroy(Provider $provider): JsonResponse
    {
        Gate::authorize('delete', $provider);

        $provider->delete();

        return response()->json(['message' => 'Provider deleted successfully.']);
    }
}

