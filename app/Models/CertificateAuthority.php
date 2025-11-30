<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Modèle CertificateAuthority (Autorité de Certification)
 * 
 * Représente la plateforme en tant qu'Autorité de Certification (CA) tierce partie.
 * La CA est une entité indépendante qui émet et signe les certificats pour les transactions.
 * 
 * Ce modèle stocke les métadonnées et la configuration de la CA, tandis que les clés CA
 * réelles sont gérées par CAService et stockées via HSMService.
 * 
 * Pattern Singleton : Il ne devrait y avoir qu'une seule CA active à la fois.
 * 
 * @package App\Models
 */
class CertificateAuthority extends Model
{
    /**
     * Attributs pouvant être assignés en masse
     * 
     * @var array<string>
     */
    protected $fillable = [
        'name',                      // Nom de la CA
        'organization',              // Organisation de la CA
        'organizational_unit',       // Unité organisationnelle de la CA
        'country',                   // Code pays (ex: "FR", "US")
        'email',                     // Email de contact de la CA
        'public_key',                // Clé publique de la CA (format PEM)
        'public_key_fingerprint',    // Empreinte SHA-256 de la clé publique
        'key_size',                  // Taille de la clé en bits (ex: 4096)
        'is_active',                 // Statut actif/inactif de la CA
        'established_at',            // Date d'établissement de la CA
    ];

    /**
     * Attributs à caster vers des types spécifiques
     * 
     * @var array<string, string>
     */
    protected $casts = [
        'is_active' => 'boolean',        // Statut actif (booléen)
        'established_at' => 'datetime',  // Date d'établissement
    ];

    /**
     * Récupère l'instance CA active actuelle
     * 
     * Pattern Singleton : Il ne devrait y avoir qu'une seule CA active à la fois.
     * Cette méthode retourne la CA active ou null si aucune n'est active.
     * 
     * @return self|null L'instance CA active ou null
     */
    public static function getActiveCA(): ?self
    {
        return static::where('is_active', true)->first();
    }

    /**
     * Crée ou met à jour l'enregistrement CA
     * 
     * Cette méthode désactive d'abord toute CA existante, puis crée une nouvelle
     * CA active. Cela garantit qu'il n'y a qu'une seule CA active à la fois.
     * 
     * @param array $data Données de la CA à créer ou mettre à jour
     * @return self L'instance CA créée
     */
    public static function createOrUpdateCA(array $data): self
    {
        // Désactiver toute CA existante
        static::where('is_active', true)->update(['is_active' => false]);

        // Créer un nouvel enregistrement CA
        return static::create(array_merge($data, [
            'is_active' => true,
            'established_at' => now(),
        ]));
    }

    /**
     * Récupère le nom distingué (DN) de la CA pour les certificats
     * 
     * Le nom distingué (Distinguished Name) est utilisé dans les certificats X.509
     * pour identifier l'émetteur (issuer). Format : "C=XX, O=Organization, OU=Unit, CN=Name"
     * 
     * Composants du DN :
     * - C : Country (Pays)
     * - O : Organization (Organisation)
     * - OU : Organizational Unit (Unité organisationnelle)
     * - CN : Common Name (Nom commun)
     * 
     * @return string Le nom distingué au format X.509
     */
    public function getDistinguishedName(): string
    {
        $dn = [];
        
        // Ajouter le pays s'il est défini
        if ($this->country) {
            $dn[] = "C={$this->country}";
        }
        // Ajouter l'organisation si elle est définie
        if ($this->organization) {
            $dn[] = "O={$this->organization}";
        }
        // Ajouter l'unité organisationnelle si elle est définie
        if ($this->organizational_unit) {
            $dn[] = "OU={$this->organizational_unit}";
        }
        // Ajouter le nom commun s'il est défini
        if ($this->name) {
            $dn[] = "CN={$this->name}";
        }
        
        // Retourner le DN au format X.509 (séparé par des virgules)
        return implode(', ', $dn);
    }

    /**
     * Récupère les informations de la CA pour l'émission de certificats
     * 
     * Cette méthode retourne un tableau contenant toutes les informations nécessaires
     * pour générer et signer des certificats, incluant le nom distingué et les métadonnées.
     * 
     * @return array Tableau d'informations de la CA
     */
    public function getCAInfo(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'organization' => $this->organization,
            'organizational_unit' => $this->organizational_unit,
            'country' => $this->country,
            'email' => $this->email,
            'public_key' => $this->public_key,
            'public_key_fingerprint' => $this->public_key_fingerprint,
            'key_size' => $this->key_size,
            'distinguished_name' => $this->getDistinguishedName(),
            'established_at' => $this->established_at->toIso8601String(),
        ];
    }
}

