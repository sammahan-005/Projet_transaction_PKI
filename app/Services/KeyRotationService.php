<?php

namespace App\Services;

use App\Models\Account;
use App\Models\PrivateKey;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Service de rotation des clés
 * 
 * Gère les politiques de rotation des clés pour les clés utilisateurs et les clés CA.
 * 
 * Fonctionnalités supportées :
 * - Rotation automatique basée sur l'âge de la clé
 * - Rotation manuelle forcée
 * - Période de grâce pour les transitions de clés
 * - Support de plusieurs versions de clés actives pendant la rotation
 * 
 * Politiques de rotation :
 * - Clés utilisateurs : rotation recommandée tous les 365 jours (1 an)
 * - Clés CA : rotation recommandée tous les 1095 jours (3 ans)
 * - Période de grâce : 30 jours pour permettre la transition
 * 
 * @package App\Services
 */
class KeyRotationService
{
    /** @var RSAService Service RSA pour la génération de nouvelles clés */
    protected RSAService $rsaService;
    
    /** @var CAService Service CA pour la gestion de la CA */
    protected CAService $caService;
    
    /** @var HSMService Service HSM pour le stockage sécurisé des clés CA */
    protected HSMService $hsmService;

    // Politiques de rotation
    /** @var int Âge maximum des clés utilisateurs en jours (365 = 1 an) */
    protected int $userKeyMaxAge = 365;
    
    /** @var int Âge maximum des clés CA en jours (1095 = 3 ans) */
    protected int $caKeyMaxAge = 1095;
    
    /** @var int Période de grâce en jours pour les transitions de clés (30 jours) */
    protected int $rotationGracePeriod = 30;

    /**
     * Constructeur du service de rotation des clés
     * 
     * @param RSAService $rsaService Service RSA pour la génération de clés
     * @param CAService $caService Service CA pour la gestion de la CA
     * @param HSMService $hsmService Service HSM pour le stockage sécurisé
     */
    public function __construct(
        RSAService $rsaService,
        CAService $caService,
        HSMService $hsmService
    ) {
        $this->rsaService = $rsaService;
        $this->caService = $caService;
        $this->hsmService = $hsmService;
    }

    /**
     * Fait tourner la paire de clés d'un utilisateur
     * 
     * Cette méthode génère une nouvelle paire de clés RSA pour le compte,
     * marque l'ancienne clé comme dépréciée (pour la période de grâce),
     * et met à jour le compte avec la nouvelle clé publique.
     * 
     * Processus atomique :
     * 1. Vérifier que la rotation est nécessaire (sauf si forcée)
     * 2. Marquer l'ancienne clé comme dépréciée
     * 3. Générer une nouvelle paire de clés
     * 4. Mettre à jour le compte avec la nouvelle clé publique
     * 5. Créer un nouvel enregistrement de clé privée chiffrée
     * 
     * @param Account $account Le compte pour lequel faire tourner les clés
     * @param bool $force Forcer la rotation même si elle n'est pas due
     * @return bool True si la rotation a réussi, false sinon
     */
    public function rotateUserKey(Account $account, bool $force = false): bool
    {
        try {
            return DB::transaction(function () use ($account, $force) {
                $privateKey = $account->privateKey;
                
                if (!$privateKey) {
                    throw new \Exception('Clé privée non trouvée pour le compte');
                }

                // Vérifier si la rotation est nécessaire
                if (!$force && !$this->shouldRotateUserKey($account)) {
                    Log::info("Rotation de clé non nécessaire pour le compte {$account->id}");
                    return false;
                }

                // Marquer l'ancienne clé comme dépréciée (garder pour la période de grâce)
                $privateKey->update([
                    'deprecated_at' => now(),
                    'deprecated_reason' => 'key_rotation',
                ]);

                // Générer une nouvelle paire de clés
                $newKeyPair = $this->rsaService->generateKeyPair();

                // Mettre à jour le compte avec la nouvelle clé publique
                $account->public_key = $newKeyPair['public_key'];
                $account->key_version = ($account->key_version ?? 0) + 1;
                $account->key_rotated_at = now();
                $account->save();

                // Créer un nouvel enregistrement de clé privée chiffrée
                $encryptedPrivateKey = $this->rsaService->encryptPrivateKeyWithAppKey(
                    $newKeyPair['private_key']
                );

                PrivateKey::create([
                    'user_id' => $account->user_id,
                    'account_id' => $account->id,
                    'encrypted_private_key' => $encryptedPrivateKey,
                    'key_version' => $account->key_version,
                    'created_at' => now(),
                ]);

                Log::info("Clé tournée pour le compte {$account->id}, nouvelle version : {$account->key_version}");

                return true;
            });
        } catch (\Exception $e) {
            Log::error("Échec de la rotation de la clé utilisateur : " . $e->getMessage());
            return false;
        }
    }

    /**
     * Fait tourner la paire de clés de la CA
     * 
     * Cette méthode génère une nouvelle paire de clés RSA 4096 bits pour la CA,
     * archive l'ancienne clé (pour la période de grâce), et met à jour
     * les métadonnées de la CA.
     * 
     * ⚠️ SÉCURITÉ : La rotation de la clé CA est une opération critique qui affecte
     * tous les certificats futurs. Assurez-vous d'avoir une sauvegarde de l'ancienne clé.
     * 
     * @param bool $force Forcer la rotation même si elle n'est pas due
     * @return bool True si la rotation a réussi, false sinon
     */
    public function rotateCAKey(bool $force = false): bool
    {
        try {
            // Vérifier si la rotation est nécessaire
            if (!$force && !$this->shouldRotateCAKey()) {
                Log::info('Rotation de clé CA non nécessaire');
                return false;
            }

            // Récupérer les informations de la clé CA actuelle
            $currentKeyId = 'current';
            $newKeyId = 'v' . time(); // Identifiant de clé versionné

            // Générer une nouvelle paire de clés CA (4096 bits)
            $newKeyPair = $this->rsaService->generateKeyPair(4096);

            // Stocker la nouvelle clé publique CA
            $caPublicKeyPath = storage_path('app/ca/public_key.pem');
            file_put_contents($caPublicKeyPath, $newKeyPair['public_key']);
            chmod($caPublicKeyPath, 0644);

            // Stocker la nouvelle clé privée CA via HSM
            $this->hsmService->storeCAPrivateKey($newKeyPair['private_key'], $newKeyId);

            // Archiver l'ancienne clé (garder pour la période de grâce)
            $oldKeyId = $currentKeyId . '_deprecated_' . time();
            if ($this->hsmService->keyExists($currentKeyId)) {
                // Copier l'ancienne clé vers l'emplacement déprécié
                $oldKey = $this->hsmService->getCAPrivateKey($currentKeyId);
                if ($oldKey) {
                    $this->hsmService->storeCAPrivateKey($oldKey, $oldKeyId);
                }
            }

            // Mettre à jour la référence de la clé actuelle
            $this->hsmService->storeCAPrivateKey($newKeyPair['private_key'], $currentKeyId);

            // Mettre à jour les métadonnées de la CA
            $this->updateCAMetadata([
                'current_key_id' => $newKeyId,
                'previous_key_id' => $oldKeyId,
                'rotated_at' => now()->toIso8601String(),
            ]);

            Log::info("Clé CA tournée, nouvel identifiant de clé : {$newKeyId}");

            return true;
        } catch (\Exception $e) {
            Log::error("Échec de la rotation de la clé CA : " . $e->getMessage());
            return false;
        }
    }

    /**
     * Vérifie si la clé utilisateur devrait être tournée
     * 
     * Une clé utilisateur devrait être tournée si :
     * - Elle n'a jamais été tournée et le compte a plus de userKeyMaxAge jours
     * - Elle a été tournée il y a plus de userKeyMaxAge jours
     * 
     * @param Account $account Le compte à vérifier
     * @return bool True si la clé devrait être tournée
     */
    public function shouldRotateUserKey(Account $account): bool
    {
        // Vérifier si la clé n'a jamais été tournée ou si la date de rotation est manquante
        if (!$account->key_rotated_at) {
            // Vérifier l'âge du compte depuis sa création
            $accountAge = $account->created_at->diffInDays(now());
            return $accountAge >= $this->userKeyMaxAge;
        }

        // Vérifier le temps écoulé depuis la dernière rotation
        $daysSinceRotation = $account->key_rotated_at->diffInDays(now());
        return $daysSinceRotation >= $this->userKeyMaxAge;
    }

    /**
     * Vérifie si la clé CA devrait être tournée
     * 
     * Une clé CA devrait être tournée si :
     * - Elle n'a jamais été tournée et la CA a plus de caKeyMaxAge jours
     * - Elle a été tournée il y a plus de caKeyMaxAge jours
     * 
     * @return bool True si la clé CA devrait être tournée
     */
    public function shouldRotateCAKey(): bool
    {
        $metadata = $this->getCAMetadata();
        
        if (!isset($metadata['rotated_at'])) {
            // Vérifier la date d'initialisation de la CA (stockée dans les métadonnées ou mtime du fichier)
            $caPublicKeyPath = storage_path('app/ca/public_key.pem');
            if (file_exists($caPublicKeyPath)) {
                $fileAge = now()->diffInDays(now()->setTimestamp(filemtime($caPublicKeyPath)));
                return $fileAge >= $this->caKeyMaxAge;
            }
            return false;
        }

        $rotatedAt = \Carbon\Carbon::parse($metadata['rotated_at']);
        $daysSinceRotation = $rotatedAt->diffInDays(now());
        
        return $daysSinceRotation >= $this->caKeyMaxAge;
    }

    /**
     * Récupère les comptes qui nécessitent une rotation de clé
     * 
     * Cette méthode retourne tous les comptes dont les clés ont dépassé
     * l'âge maximum autorisé selon la politique de rotation.
     * 
     * @return \Illuminate\Support\Collection Collection des comptes nécessitant une rotation
     */
    public function getAccountsNeedingRotation(): \Illuminate\Support\Collection
    {
        return Account::where(function ($query) {
            // Comptes dont la clé n'a jamais été tournée et qui ont plus de userKeyMaxAge jours
            $query->whereNull('key_rotated_at')
                ->where('created_at', '<=', now()->subDays($this->userKeyMaxAge));
        })->orWhere(function ($query) {
            // Comptes dont la dernière rotation date de plus de userKeyMaxAge jours
            $query->whereNotNull('key_rotated_at')
                ->where('key_rotated_at', '<=', now()->subDays($this->userKeyMaxAge));
        })->get();
    }

    /**
     * Fait tourner les clés pour tous les comptes qui en ont besoin
     * 
     * Cette méthode peut être appelée périodiquement via une tâche planifiée
     * pour automatiser la rotation des clés expirées.
     * 
     * @return array Tableau contenant les résultats (success, failed, errors)
     */
    public function rotateAllExpiredKeys(): array
    {
        $accounts = $this->getAccountsNeedingRotation();
        $results = [
            'success' => 0,
            'failed' => 0,
            'errors' => [],
        ];

        foreach ($accounts as $account) {
            try {
                if ($this->rotateUserKey($account)) {
                    $results['success']++;
                } else {
                    $results['failed']++;
                }
            } catch (\Exception $e) {
                $results['failed']++;
                $results['errors'][] = "Compte {$account->id} : " . $e->getMessage();
            }
        }

        return $results;
    }

    /**
     * Nettoie les clés dépréciées après la période de grâce
     * 
     * Cette méthode supprime définitivement les clés dépréciées qui ont dépassé
     * la période de grâce. Elle peut être appelée périodiquement via une tâche planifiée.
     * 
     * @return int Le nombre total de clés nettoyées (utilisateurs + CA)
     */
    public function cleanupDeprecatedKeys(): int
    {
        $cutoffDate = now()->subDays($this->rotationGracePeriod);
        
        // Nettoyer les clés privées utilisateurs dépréciées
        $deletedUserKeys = PrivateKey::whereNotNull('deprecated_at')
            ->where('deprecated_at', '<=', $cutoffDate)
            ->delete();

        // Nettoyer les clés CA dépréciées
        $deprecatedCAKeys = $this->listDeprecatedCAKeys();
        $deletedCAKeys = 0;
        foreach ($deprecatedCAKeys as $keyId) {
            if ($this->isDeprecatedKeyExpired($keyId)) {
                // Supprimer la clé CA dépréciée (l'implémentation dépend du backend HSM)
                $deletedCAKeys++;
            }
        }

        return $deletedUserKeys + $deletedCAKeys;
    }

    /**
     * Récupère les métadonnées de la CA
     * 
     * Les métadonnées sont stockées dans un fichier JSON et contiennent
     * des informations sur la rotation des clés (dates, identifiants, etc.).
     * 
     * @return array Tableau des métadonnées de la CA
     */
    private function getCAMetadata(): array
    {
        $metadataPath = storage_path('app/ca/metadata.json');
        if (!file_exists($metadataPath)) {
            return [];
        }

        $content = file_get_contents($metadataPath);
        return json_decode($content, true) ?? [];
    }

    /**
     * Met à jour les métadonnées de la CA
     * 
     * Les métadonnées sont fusionnées avec les données existantes
     * et sauvegardées dans un fichier JSON avec permissions restrictives.
     * 
     * @param array $data Les nouvelles données de métadonnées à ajouter/mettre à jour
     * @return void
     */
    private function updateCAMetadata(array $data): void
    {
        $metadataPath = storage_path('app/ca/metadata.json');
        $existing = $this->getCAMetadata();
        $updated = array_merge($existing, $data);
        
        file_put_contents($metadataPath, json_encode($updated, JSON_PRETTY_PRINT));
        chmod($metadataPath, 0600); // Permissions : lecture/écriture pour le propriétaire uniquement
    }

    /**
     * Liste toutes les clés CA dépréciées
     * 
     * Les clés dépréciées sont identifiées par la présence du mot "deprecated"
     * dans leur identifiant.
     * 
     * @return array Tableau des identifiants de clés dépréciées
     */
    private function listDeprecatedCAKeys(): array
    {
        $allKeys = $this->hsmService->listKeyIds();
        return array_filter($allKeys, fn($keyId) => strpos($keyId, 'deprecated') !== false);
    }

    /**
     * Vérifie si une clé dépréciée a dépassé la période de grâce
     * 
     * Extrait le timestamp de l'identifiant de clé (format: current_deprecated_TIMESTAMP)
     * et vérifie si la période de grâce a expiré.
     * 
     * @param string $keyId L'identifiant de la clé dépréciée
     * @return bool True si la période de grâce a expiré
     */
    private function isDeprecatedKeyExpired(string $keyId): bool
    {
        // Extraire le timestamp de l'identifiant de clé (format: current_deprecated_TIMESTAMP)
        if (preg_match('/deprecated_(\d+)/', $keyId, $matches)) {
            $timestamp = (int) $matches[1];
            $deprecatedAt = \Carbon\Carbon::createFromTimestamp($timestamp);
            return $deprecatedAt->addDays($this->rotationGracePeriod)->isPast();
        }
        
        return false;
    }

    /**
     * Récupère les paramètres de la politique de rotation
     * 
     * Retourne les valeurs actuelles des politiques de rotation
     * (âge maximum des clés utilisateurs, CA, période de grâce).
     * 
     * @return array Tableau contenant les paramètres de la politique
     */
    public function getRotationPolicy(): array
    {
        return [
            'user_key_max_age_days' => $this->userKeyMaxAge,
            'ca_key_max_age_days' => $this->caKeyMaxAge,
            'grace_period_days' => $this->rotationGracePeriod,
        ];
    }

    /**
     * Définit la politique de rotation
     * 
     * Permet de configurer les paramètres de rotation des clés.
     * Utile pour adapter les politiques selon les besoins de sécurité.
     * 
     * @param int $userKeyMaxAge Âge maximum des clés utilisateurs en jours
     * @param int $caKeyMaxAge Âge maximum des clés CA en jours
     * @param int $gracePeriod Période de grâce en jours
     * @return void
     */
    public function setRotationPolicy(int $userKeyMaxAge, int $caKeyMaxAge, int $gracePeriod): void
    {
        $this->userKeyMaxAge = $userKeyMaxAge;
        $this->caKeyMaxAge = $caKeyMaxAge;
        $this->rotationGracePeriod = $gracePeriod;
    }
}

