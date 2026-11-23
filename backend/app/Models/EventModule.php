<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventModule extends Model
{
    public const AVAILABLE_MODULES = [
        'providers',
        'inventory',
        'rsvp',
        'schedule',
        'budget',
        'tasks',
    ];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'event_id',
        'module_key',
        'is_enabled',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'settings' => 'array',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}

