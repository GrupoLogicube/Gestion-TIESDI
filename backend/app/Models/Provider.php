<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Provider extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'organizer_id',
        'user_id',
        'business_name',
        'category',
        'contact_name',
        'email',
        'phone',
        'notes',
    ];

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function eventProviders(): HasMany
    {
        return $this->hasMany(EventProvider::class);
    }

    public function events(): BelongsToMany
    {
        return $this->belongsToMany(Event::class, 'event_providers')
            ->withPivot([
                'user_id',
                'service_description',
                'agreed_cost',
                'advance_paid',
                'setup_at',
                'show_at',
                'teardown_at',
                'status',
                'notes',
            ])
            ->withTimestamps();
    }
}

