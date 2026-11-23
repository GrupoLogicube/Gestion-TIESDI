<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryItem extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'event_id',
        'name',
        'category',
        'unit',
        'planned_qty',
        'actual_qty',
        'status',
        'checked_in_at',
        'checked_out_at',
        'last_updated_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'planned_qty' => 'integer',
            'actual_qty' => 'integer',
            'checked_in_at' => 'datetime',
            'checked_out_at' => 'datetime',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function lastUpdatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'last_updated_by');
    }
}

