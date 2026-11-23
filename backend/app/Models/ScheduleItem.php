<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleItem extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'event_id',
        'event_provider_id',
        'title',
        'description',
        'starts_at',
        'ends_at',
        'location_area',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'sort_order' => 'integer',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function eventProvider(): BelongsTo
    {
        return $this->belongsTo(EventProvider::class);
    }
}

