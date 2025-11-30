<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Crypt;

/**
 * Modèle PrivateKey (Clé Privée)
 * 
 * Représente une clé privée RSA chiffrée associée à un compte utilisateur.
 * 
 * 🔐 SÉCURITÉ CRITIQUE :
 * - La clé privée est toujours stockée chiffrée dans la base de données
 * - Le chiffrement utilise la clé d'application Laravel (APP_KEY)
 * - La clé privée est automatiquement déchiffrée lors de l'accès via les accesseurs
 * - Les paramètres de clé (p, q) peuvent être stockés séparément pour backup
 * 
 * Chaque compte possède une seule clé privée, utilisée pour signer les transactions sortantes.
 * 
 * @package App\Models
 */
class PrivateKey extends Model
{
    /**
     * Attributs pouvant être assignés en masse
     * 
     * @var array<string>
     */
    protected $fillable = [
        'user_id',                  // ID de l'utilisateur propriétaire
        'account_id',               // ID du compte associé
        'encrypted_private_key',    // Clé privée chiffrée (format Laravel Crypt)
        'encrypted_key_params',     // Paramètres de clé chiffrés (p, q) pour backup (optionnel)
    ];

    /**
     * Relation : Récupère l'utilisateur propriétaire de la clé privée
     * 
     * @return BelongsTo Relation vers le modèle User
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relation : Récupère le compte associé à cette clé privée
     * 
     * Chaque compte possède une seule clé privée correspondant à sa clé publique.
     * 
     * @return BelongsTo Relation vers le modèle Account
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    /**
     * Accesseur/Mutateur : Déchiffre la clé privée lors de l'accès
     * 
     * Cet accesseur permet d'accéder à la clé privée déchiffrée via $privateKey->private_key.
     * Le mutateur chiffre automatiquement la clé lors de l'assignation.
     * 
     * ⚠️ ATTENTION : L'accès à cette propriété déchiffre la clé privée en mémoire.
     * Utilisez avec précaution et ne loggez jamais cette valeur.
     * 
     * @return Attribute Accesseur/mutateur pour la clé privée
     */
    protected function privateKey(): Attribute
    {
        return Attribute::make(
            // Getter : déchiffre automatiquement la clé privée lors de l'accès
            get: fn () => Crypt::decryptString($this->encrypted_private_key),
            // Setter : chiffre automatiquement la clé privée lors de l'assignation
            set: fn ($value) => ['encrypted_private_key' => Crypt::encryptString($value)]
        );
    }

    /**
     * Accesseur/Mutateur : Déchiffre les paramètres de clé lors de l'accès
     * 
     * Les paramètres de clé (p, q) sont les nombres premiers utilisés pour générer
     * la paire de clés RSA. Ils peuvent être stockés pour faciliter la récupération
     * ou la rotation des clés, mais ne sont pas nécessaires pour signer les transactions.
     * 
     * @return Attribute Accesseur/mutateur pour les paramètres de clé
     */
    protected function keyParams(): Attribute
    {
        return Attribute::make(
            // Getter : déchiffre les paramètres si présents, sinon retourne null
            get: fn () => $this->encrypted_key_params ? Crypt::decryptString($this->encrypted_key_params) : null,
            // Setter : chiffre les paramètres si fournis, sinon null
            set: fn ($value) => ['encrypted_key_params' => $value ? Crypt::encryptString($value) : null]
        );
    }
}
