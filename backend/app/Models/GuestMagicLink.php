<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GuestMagicLink extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'guest_id',
        'token_hash',
        'token_prefix',
        'expires_at',
        'last_accessed_at',
        'access_count',
        'revoked_at',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'token_hash',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'last_accessed_at' => 'datetime',
            'revoked_at' => 'datetime',
            'access_count' => 'integer',
        ];
    }

    public function guest(): BelongsTo
    {
        return $this->belongsTo(Guest::class);
    }
}

