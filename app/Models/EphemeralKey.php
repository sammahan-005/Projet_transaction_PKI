<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ephemeral Key Model
 * 
 * Stores ephemeral (temporary) public keys for sessions.
 * These keys are used for transaction signing and provide forward secrecy.
 * Private keys are never stored - they exist only in the client's session.
 */
class EphemeralKey extends Model
{
    protected $fillable = [
        'user_id',
        'account_id',
        'session_id',
        'public_key',
        'expires_at',
        'is_active',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    /**
     * Get the user that owns the ephemeral key
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the account associated with this ephemeral key
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    /**
     * Check if the key has expired
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Scope to get only active, non-expired keys
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where('expires_at', '>', now());
    }

    /**
     * Deactivate the key
     */
    public function deactivate(): void
    {
        $this->update(['is_active' => false]);
    }
}

