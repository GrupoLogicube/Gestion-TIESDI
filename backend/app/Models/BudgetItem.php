<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetItem extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'event_id',
        'event_provider_id',
        'category',
        'title',
        'estimated_amount',
        'actual_amount',
        'paid_amount',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'estimated_amount' => 'decimal:2',
            'actual_amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
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

