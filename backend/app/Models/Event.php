<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Event extends Model
{
    use SoftDeletes;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'organizer_id',
        'title',
        'description',
        'location',
        'location_url',
        'starts_at',
        'ends_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    public function modules(): HasMany
    {
        return $this->hasMany(EventModule::class);
    }

    public function hasModuleEnabled(string $moduleKey): bool
    {
        return $this->modules()
            ->where('module_key', $moduleKey)
            ->where('is_enabled', true)
            ->exists();
    }

    public function eventProviders(): HasMany
    {
        return $this->hasMany(EventProvider::class);
    }

    public function providers(): BelongsToMany
    {
        return $this->belongsToMany(Provider::class, 'event_providers')
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

    public function guests(): HasMany
    {
        return $this->hasMany(Guest::class);
    }

    public function inventoryItems(): HasMany
    {
        return $this->hasMany(InventoryItem::class);
    }

    public function scheduleItems(): HasMany
    {
        return $this->hasMany(ScheduleItem::class);
    }

    public function budgetItems(): HasMany
    {
        return $this->hasMany(BudgetItem::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }
}

