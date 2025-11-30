<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Modèle Certificate (Certificat PKI)
 * 
 * Représente un certificat PKI émis par l'Autorité de Certification (CA) pour une transaction.
 * Chaque transaction validée possède un certificat qui :
 * - Atteste de la validité de la transaction
 * - Contient les informations des clés publiques (expéditeur et destinataire)
 * - Est signé par la clé privée de la CA tierce partie
 * - Possède un numéro de série unique
 * - A une date d'expiration (généralement 1 an)
 * 
 * Le certificat est stocké au format PEM et peut être vérifié avec la clé publique de la CA.
 * 
 * @package App\Models
 */
class Certificate extends Model
{
    /**
     * Attributs pouvant être assignés en masse
     * 
     * @var array<string>
     */
    protected $fillable = [
        'transaction_id',      // ID de la transaction associée
        'certificate_data',    // Données du certificat au format PEM
        'serial_number',       // Numéro de série unique du certificat
        'issued_at',           // Date d'émission du certificat
        'expires_at',          // Date d'expiration du certificat
        'issuer',              // Nom distingué (DN) de l'émetteur (CA)
        'subject',             // Nom distingué (DN) du sujet (transaction)
        'signature',           // Signature du certificat par la CA (base64)
    ];

    /**
     * Attributs à caster vers des types spécifiques
     * 
     * @var array<string, string>
     */
    protected $casts = [
        'issued_at' => 'datetime',   // Date d'émission
        'expires_at' => 'datetime',  // Date d'expiration
    ];

    /**
     * Relation : Récupère la transaction associée à ce certificat
     * 
     * Chaque certificat est lié à une seule transaction.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo Relation vers le modèle Transaction
     */
    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }
}
