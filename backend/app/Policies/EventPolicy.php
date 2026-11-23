<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\User;

class EventPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('events.view');
    }

    public function view(User $user, Event $event): bool
    {
        return $event->organizer_id === $user->id && $user->hasPermissionTo('events.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('events.create');
    }

    public function update(User $user, Event $event): bool
    {
        return $event->organizer_id === $user->id && $user->hasPermissionTo('events.update');
    }

    public function delete(User $user, Event $event): bool
    {
        return $event->organizer_id === $user->id && $user->hasPermissionTo('events.delete');
    }

    public function configureModules(User $user, Event $event): bool
    {
        return $event->organizer_id === $user->id && $user->hasPermissionTo('events.configure_modules');
    }
}

