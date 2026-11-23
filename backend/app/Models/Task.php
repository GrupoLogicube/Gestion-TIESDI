<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Task extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'event_id',
        'assigned_to',
        'title',
        'description',
        'status',
        'priority',
        'due_at',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'due_at' => 'datetime',
            'sort_order' => 'integer',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}

