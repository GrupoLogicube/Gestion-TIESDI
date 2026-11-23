<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Guest extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'event_id',
        'name',
        'email',
        'phone',
        'passes_count',
        'confirmed_passes',
        'rsvp_status',
        'notes',
        'responded_at',
    ];

    protected function casts(): array
    {
        return [
            'passes_count' => 'integer',
            'confirmed_passes' => 'integer',
            'responded_at' => 'datetime',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function magicLinks(): HasMany
    {
        return $this->hasMany(GuestMagicLink::class);
    }
}

