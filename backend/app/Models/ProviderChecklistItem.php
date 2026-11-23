<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProviderChecklistItem extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'event_provider_id',
        'item_name',
        'quantity',
        'is_prepared',
        'prepared_at',
        'prepared_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'is_prepared' => 'boolean',
            'prepared_at' => 'datetime',
        ];
    }

    public function eventProvider(): BelongsTo
    {
        return $this->belongsTo(EventProvider::class);
    }

    public function preparedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prepared_by');
    }
}

