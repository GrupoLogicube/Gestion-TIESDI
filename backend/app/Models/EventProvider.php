<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventProvider extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'event_id',
        'provider_id',
        'user_id',
        'service_description',
        'agreed_cost',
        'advance_paid',
        'setup_at',
        'show_at',
        'teardown_at',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'agreed_cost' => 'decimal:2',
            'advance_paid' => 'decimal:2',
            'setup_at' => 'datetime',
            'show_at' => 'datetime',
            'teardown_at' => 'datetime',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(Provider::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function checklistItems(): HasMany
    {
        return $this->hasMany(ProviderChecklistItem::class);
    }

    public function scheduleItems(): HasMany
    {
        return $this->hasMany(ScheduleItem::class);
    }

    public function budgetItems(): HasMany
    {
        return $this->hasMany(BudgetItem::class);
    }
}

