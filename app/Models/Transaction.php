<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Modèle Transaction
 * 
 * Représente une transaction financière sécurisée avec signature numérique PKI.
 * Chaque transaction contient :
 * - Les informations de l'expéditeur et du destinataire
 * - Le montant de la transaction
 * - Un hash SHA-256 des données de transaction
 * - Une signature numérique RSA de l'expéditeur
 * - Un statut (pending, approved, rejected, failed)
 * 
 * @package App\Models
 */
class Transaction extends Model
{
    /**
     * Attributs pouvant être assignés en masse
     * 
     * @var array<string>
     */
    protected $fillable = [
        'sender_account_id',      // ID du compte expéditeur
        'receiver_account_id',    // ID du compte destinataire
        'amount',                 // Montant de la transaction
        'transaction_hash',       // Hash SHA-256 des données de transaction
        'digital_signature',       // Signature numérique RSA de l'expéditeur
        'status',                 // Statut : pending, approved, rejected, failed
        'rejection_reason',       // Raison du rejet (si rejetée)
        'approved_at',            // Date d'approbation
        'rejected_at',            // Date de rejet
    ];

    /**
     * Attributs à caster vers des types spécifiques
     * 
     * @var array<string, string>
     */
    protected $casts = [
        'amount' => 'decimal:2',      // Montant avec 2 décimales
        'approved_at' => 'datetime',   // Date d'approbation
        'rejected_at' => 'datetime',   // Date de rejet
    ];

    /**
     * Relation : Récupère le compte expéditeur de la transaction
     * 
     * @return BelongsTo Relation vers le modèle Account
     */
    public function senderAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'sender_account_id');
    }

    /**
     * Relation : Récupère le compte destinataire de la transaction
     * 
     * @return BelongsTo Relation vers le modèle Account
     */
    public function receiverAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'receiver_account_id');
    }

    /**
     * Relation : Récupère tous les logs d'audit de cette transaction
     * 
     * Les logs contiennent l'historique complet des actions effectuées sur la transaction
     * (création, vérification, approbation, rejet, etc.)
     * 
     * @return HasMany Relation vers le modèle TransactionLog
     */
    public function logs(): HasMany
    {
        return $this->hasMany(TransactionLog::class);
    }

    /**
     * Relation : Récupère le certificat PKI associé à cette transaction
     * 
     * Chaque transaction validée possède un certificat PKI signé par l'autorité de certification.
     * 
     * @return HasOne Relation vers le modèle Certificate
     */
    public function certificate(): HasOne
    {
        return $this->hasOne(Certificate::class);
    }

    /**
     * Vérifie si la transaction est en attente (pending)
     * 
     * @return bool True si le statut est 'pending'
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Vérifie si la transaction est approuvée (approved)
     * 
     * @return bool True si le statut est 'approved'
     */
    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    /**
     * Vérifie si la transaction est rejetée (rejected)
     * 
     * @return bool True si le statut est 'rejected'
     */
    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }

    /**
     * Marque la transaction comme approuvée
     * 
     * Cette méthode met à jour le statut de la transaction à 'approved' et enregistre
     * la date d'approbation. Elle est appelée après la vérification réussie de la signature
     * et la mise à jour des soldes des comptes.
     * 
     * @return void
     */
    public function markAsApproved(): void
    {
        $this->update([
            'status' => 'approved',
            'approved_at' => now(),
        ]);
    }

    /**
     * Marque la transaction comme rejetée avec une raison
     * 
     * Cette méthode est appelée lorsque la transaction échoue la vérification
     * (signature invalide, solde insuffisant, etc.)
     * 
     * @param string $reason La raison du rejet (ex: "Signature invalide", "Solde insuffisant")
     * @return void
     */
    public function markAsRejected(string $reason): void
    {
        $this->update([
            'status' => 'rejected',
            'rejection_reason' => $reason,
            'rejected_at' => now(),
        ]);
    }

    /**
     * Marque la transaction comme échouée avec une raison
     * 
     * Cette méthode est utilisée pour les erreurs techniques ou système
     * qui empêchent le traitement de la transaction.
     * 
     * @param string $reason La raison de l'échec (ex: "Erreur de base de données")
     * @return void
     */
    public function markAsFailed(string $reason): void
    {
        $this->update([
            'status' => 'failed',
            'rejection_reason' => $reason,
        ]);
    }
}
