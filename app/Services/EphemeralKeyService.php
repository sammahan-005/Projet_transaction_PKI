<?php

namespace App\Services;

use App\Models\EphemeralKey;
use App\Models\Account;
use Illuminate\Support\Facades\Log;

/**
 * Service de gestion des clés éphémères
 * 
 * Gère les clés éphémères (temporaires) pour les sessions.
 * Ces clés fournissent la confidentialité persistante (forward secrecy) :
 * si une clé est compromise, seule la session actuelle est affectée.
 * 
 * Flux d'utilisation :
 * 1. Le client génère une paire de clés éphémères (ne jamais envoyer la clé privée au serveur)
 * 2. Le client envoie la clé publique au serveur et reçoit un session_id
 * 3. Le client utilise la clé privée éphémère pour signer les transactions
 * 4. Le serveur vérifie les signatures en utilisant la clé publique éphémère
 * 5. Les clés expirent après la fin de la session ou le timeout
 * 
 * @package App\Services
 */
class EphemeralKeyService
{
    /** @var int Durée de vie par défaut des clés éphémères en secondes (1 heure) */
    protected int $defaultLifetime = 3600;

    /**
     * Enregistre une clé publique éphémère pour une session
     * 
     * Cette méthode désactive d'abord toute clé éphémère active existante pour le compte,
     * puis crée une nouvelle clé éphémère avec un identifiant de session unique.
     * 
     * @param Account $account Le compte pour lequel enregistrer la clé
     * @param string $publicKeyPem La clé publique au format PEM
     * @param int|null $lifetime Durée de vie en secondes (par défaut: 1 heure)
     * @return EphemeralKey L'enregistrement de clé éphémère créé
     */
    public function registerEphemeralKey(
        Account $account,
        string $publicKeyPem,
        ?int $lifetime = null
    ): EphemeralKey {
        // Utiliser la durée de vie fournie ou la valeur par défaut
        $lifetime = $lifetime ?? $this->defaultLifetime;
        
        // Générer un identifiant de session unique
        $sessionId = $this->generateSessionId();

        // Désactiver toute clé éphémère active existante pour ce compte
        // Cela garantit qu'une seule clé éphémère est active à la fois par compte
        EphemeralKey::where('account_id', $account->id)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        // Créer et retourner la nouvelle clé éphémère
        return EphemeralKey::create([
            'user_id' => $account->user_id,
            'account_id' => $account->id,
            'session_id' => $sessionId,
            'public_key' => $publicKeyPem,
            'expires_at' => now()->addSeconds($lifetime),
            'is_active' => true,
        ]);
    }

    /**
     * Récupère la clé éphémère active pour une session
     * 
     * Cette méthode vérifie que la clé existe, est active et n'a pas expiré.
     * Si la clé est expirée, elle est automatiquement désactivée.
     * 
     * @param string $sessionId L'identifiant de session
     * @return EphemeralKey|null La clé active ou null si non trouvée/expirée
     */
    public function getActiveKey(string $sessionId): ?EphemeralKey
    {
        // Récupérer la clé éphémère active pour cette session
        $key = EphemeralKey::where('session_id', $sessionId)
            ->active()
            ->first();

        if (!$key) {
            return null;
        }

        // Vérification double de l'expiration (sécurité supplémentaire)
        if ($key->isExpired()) {
            $key->deactivate();
            return null;
        }

        return $key;
    }

    /**
     * Vérifie une signature en utilisant la clé publique éphémère
     * 
     * Cette méthode récupère la clé éphémère active pour la session,
     * puis utilise RSAService pour vérifier la signature des données.
     * 
     * @param string $data Les données qui ont été signées
     * @param string $signature La signature à vérifier (encodée en base64)
     * @param string $sessionId L'identifiant de session
     * @return bool True si la signature est valide, false sinon
     */
    public function verifySignature(
        string $data,
        string $signature,
        string $sessionId
    ): bool {
        // Récupérer la clé éphémère active pour cette session
        $ephemeralKey = $this->getActiveKey($sessionId);
        
        if (!$ephemeralKey) {
            Log::warning("Aucune clé éphémère active trouvée pour la session : {$sessionId}");
            return false;
        }

        // Utiliser RSAService pour vérifier la signature
        $rsaService = app(RSAService::class);
        
        try {
            return $rsaService->verify($data, $signature, $ephemeralKey->public_key);
        } catch (\Exception $e) {
            Log::error("Échec de la vérification de signature avec clé éphémère : " . $e->getMessage());
            return false;
        }
    }

    /**
     * Désactive une clé éphémère (met fin à la session)
     * 
     * Cette méthode est appelée lorsque l'utilisateur se déconnecte
     * ou que la session expire pour sécuriser la clé éphémère.
     * 
     * @param string $sessionId L'identifiant de session
     * @return bool True si la désactivation a réussi, false si la clé n'existe pas
     */
    public function deactivateKey(string $sessionId): bool
    {
        $key = EphemeralKey::where('session_id', $sessionId)->first();
        
        if (!$key) {
            return false;
        }

        // Désactiver la clé (marquer comme inactive)
        $key->deactivate();
        return true;
    }

    /**
     * Nettoie les clés éphémères expirées
     * 
     * Cette méthode désactive toutes les clés éphémères qui ont dépassé
     * leur date d'expiration. Elle peut être appelée périodiquement via
     * une tâche planifiée (cron job).
     * 
     * @return int Le nombre de clés nettoyées
     */
    public function cleanupExpiredKeys(): int
    {
        return EphemeralKey::where('expires_at', '<=', now())
            ->where('is_active', true)
            ->update(['is_active' => false]);
    }

    /**
     * Récupère toutes les clés éphémères actives pour un compte
     * 
     * Cette méthode peut être utile pour l'administration ou le débogage,
     * pour voir toutes les sessions actives d'un compte.
     * 
     * @param Account $account Le compte pour lequel récupérer les clés
     * @return \Illuminate\Database\Eloquent\Collection Collection des clés éphémères actives
     */
    public function getActiveKeysForAccount(Account $account)
    {
        return EphemeralKey::where('account_id', $account->id)
            ->active()
            ->get();
    }

    /**
     * Génère un identifiant de session unique
     * 
     * L'identifiant est généré à partir de 32 octets aléatoires (256 bits)
     * et converti en hexadécimal (64 caractères). La méthode vérifie
     * l'unicité avant de retourner l'ID.
     * 
     * @return string L'identifiant de session unique (64 caractères hexadécimaux)
     */
    private function generateSessionId(): string
    {
        do {
            // Générer 32 octets aléatoires et convertir en hexadécimal (64 caractères)
            $sessionId = bin2hex(random_bytes(32));
        } while (EphemeralKey::where('session_id', $sessionId)->exists());

        return $sessionId;
    }

    /**
     * Définit la durée de vie par défaut des clés éphémères
     * 
     * @param int $seconds La durée de vie en secondes
     * @return void
     */
    public function setDefaultLifetime(int $seconds): void
    {
        $this->defaultLifetime = $seconds;
    }

    /**
     * Récupère la durée de vie par défaut des clés éphémères
     * 
     * @return int La durée de vie en secondes
     */
    public function getDefaultLifetime(): int
    {
        return $this->defaultLifetime;
    }
}

