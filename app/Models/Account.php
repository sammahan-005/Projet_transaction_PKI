<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modèle Account (Compte)
 * 
 * Représente un compte utilisateur dans le système de transactions PKI.
 * Chaque compte contient :
 * - Un numéro de compte unique
 * - Une clé publique RSA (utilisée pour vérifier les signatures)
 * - Un solde (montant disponible)
 * - Un statut actif/inactif
 * 
 * La clé privée correspondante est stockée séparément dans le modèle PrivateKey
 * et est chiffrée pour des raisons de sécurité.
 * 
 * @package App\Models
 */
class Account extends Model
{
    /**
     * Attributs pouvant être assignés en masse
     * 
     * @var array<string>
     */
    protected $fillable = [
        'user_id',          // ID de l'utilisateur propriétaire du compte
        'account_number',   // Numéro de compte unique (ex: "PC123456789")
        'public_key',      // Clé publique RSA au format PEM
        'balance',         // Solde du compte (décimal avec 2 décimales)
        'is_active',       // Statut actif/inactif du compte
    ];

    /**
     * Attributs à caster vers des types spécifiques
     * 
     * @var array<string, string>
     */
    protected $casts = [
        'balance' => 'decimal:2',    // Solde avec 2 décimales
        'is_active' => 'boolean',     // Statut actif (booléen)
    ];

    /**
     * Relation : Récupère l'utilisateur propriétaire du compte
     * 
     * @return BelongsTo Relation vers le modèle User
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relation : Récupère la clé privée chiffrée associée à ce compte
     * 
     * La clé privée est stockée séparément et chiffrée pour des raisons de sécurité.
     * Elle est utilisée pour signer les transactions sortantes.
     * 
     * @return HasOne Relation vers le modèle PrivateKey
     */
    public function privateKey(): HasOne
    {
        return $this->hasOne(PrivateKey::class);
    }

    /**
     * Relation : Récupère toutes les transactions envoyées depuis ce compte
     * 
     * @return HasMany Relation vers le modèle Transaction (comme expéditeur)
     */
    public function sentTransactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'sender_account_id');
    }

    /**
     * Relation : Récupère toutes les transactions reçues sur ce compte
     * 
     * @return HasMany Relation vers le modèle Transaction (comme destinataire)
     */
    public function receivedTransactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'receiver_account_id');
    }

    /**
     * Récupère toutes les transactions (envoyées + reçues) pour ce compte
     * 
     * Cette méthode retourne toutes les transactions où ce compte est impliqué,
     * que ce soit comme expéditeur ou comme destinataire, triées par date décroissante.
     * 
     * @return \Illuminate\Database\Eloquent\Collection Collection de transactions
     */
    public function transactions()
    {
        return Transaction::where('sender_account_id', $this->id)
            ->orWhere('receiver_account_id', $this->id)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Vérifie si le compte a un solde suffisant pour effectuer une transaction
     * 
     * Cette méthode est utilisée avant de créer une transaction pour s'assurer
     * que l'utilisateur a suffisamment de fonds.
     * 
     * @param float $amount Le montant à vérifier
     * @return bool True si le solde est suffisant (balance >= amount)
     */
    public function hasSufficientBalance(float $amount): bool
    {
        return $this->balance >= $amount;
    }
}
