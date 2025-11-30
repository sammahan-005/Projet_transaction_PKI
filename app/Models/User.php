<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * Modèle User (Utilisateur)
 * 
 * Représente un utilisateur du système de transactions PKI.
 * Chaque utilisateur peut avoir :
 * - Un compte associé avec une paire de clés RSA
 * - Un PIN de transaction pour autoriser les transactions
 * - Une authentification à deux facteurs (2FA) optionnelle
 * - Un profil avec photo et informations personnelles
 * 
 * @package App\Models
 */
class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * Attributs pouvant être assignés en masse
     * 
     * @var list<string>
     */
    protected $fillable = [
        'name',              // Nom complet de l'utilisateur
        'email',             // Adresse email (utilisée pour la connexion)
        'phone',             // Numéro de téléphone
        'date_of_birth',     // Date de naissance
        'profile_picture',   // Photo de profil (base64)
        'password',          // Mot de passe (hashé automatiquement)
        'transaction_pin',   // PIN de transaction à 4 chiffres (hashé automatiquement)
    ];

    /**
     * Attributs qui doivent être cachés lors de la sérialisation
     * 
     * Ces attributs sensibles ne sont jamais retournés dans les réponses JSON/API
     * pour des raisons de sécurité.
     * 
     * @var list<string>
     */
    protected $hidden = [
        'password',                    // Mot de passe hashé
        'transaction_pin',             // PIN de transaction hashé
        'two_factor_secret',           // Secret 2FA
        'two_factor_recovery_codes',   // Codes de récupération 2FA
        'remember_token',              // Token de session "se souvenir de moi"
    ];

    /**
     * Définit les attributs qui doivent être castés vers des types spécifiques
     * 
     * Les casts automatiques permettent de convertir automatiquement les valeurs
     * de la base de données vers les types PHP appropriés.
     * 
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',        // Date de vérification de l'email
            'password' => 'hashed',                    // Hash automatique du mot de passe (Laravel)
            'transaction_pin' => 'hashed',            // Hash automatique du PIN de transaction
            'two_factor_confirmed_at' => 'datetime',  // Date de confirmation 2FA
            'date_of_birth' => 'date',                // Date de naissance
        ];
    }

    /**
     * Relation : Récupère le compte associé à l'utilisateur
     * 
     * Chaque utilisateur peut avoir un seul compte, qui contient :
     * - Le numéro de compte unique
     * - La clé publique RSA
     * - Le solde disponible
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasOne Relation vers le modèle Account
     */
    public function account()
    {
        return $this->hasOne(Account::class);
    }
}
