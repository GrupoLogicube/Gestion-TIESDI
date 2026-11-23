<?php

namespace App\Policies;

use App\Models\Provider;
use App\Models\User;

class ProviderPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('providers.manage');
    }

    public function view(User $user, Provider $provider): bool
    {
        return $provider->organizer_id === $user->id && $user->hasPermissionTo('providers.manage');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('providers.manage');
    }

    public function update(User $user, Provider $provider): bool
    {
        return $provider->organizer_id === $user->id && $user->hasPermissionTo('providers.manage');
    }

    public function delete(User $user, Provider $provider): bool
    {
        return $provider->organizer_id === $user->id && $user->hasPermissionTo('providers.manage');
    }
}

