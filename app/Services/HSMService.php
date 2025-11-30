<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Service de Module de Sécurité Matériel (HSM)
 * 
 * Fournit une couche d'abstraction pour le stockage de la clé privée de la CA.
 * Supporte plusieurs backends :
 * - Stockage fichier (par défaut, chiffré avec la clé d'application)
 * - HSM matériel (lorsque configuré)
 * - Cloud HSM (AWS CloudHSM, Azure Key Vault, etc.)
 * 
 * Cela permet au système de fonctionner avec un stockage logiciel par défaut,
 * mais peut être configuré pour utiliser de vrais HSM en production.
 * 
 * 🔐 SÉCURITÉ : Les backends HSM permettent de signer sans exposer la clé privée,
 * ce qui est plus sécurisé que le stockage fichier.
 * 
 * @package App\Services
 */
class HSMService
{
    /** @var string Le backend HSM utilisé (file, hsm, aws_cloudhsm, azure_keyvault) */
    protected string $backend;
    
    /** @var array Configuration du HSM depuis config/hsm.php */
    protected array $config;
    
    /** @var RSAService Service RSA pour les opérations cryptographiques */
    protected RSAService $rsaService;

    /**
     * Constructeur du service HSM
     * 
     * Initialise le backend HSM depuis la configuration et prépare
     * le service pour le stockage sécurisé des clés CA.
     * 
     * @param RSAService $rsaService Service RSA pour le chiffrement/déchiffrement
     */
    public function __construct(RSAService $rsaService)
    {
        $this->rsaService = $rsaService;
        $this->backend = config('hsm.backend', 'file');
        $this->config = config('hsm', []);
    }

    /**
     * Stocke la clé privée de la CA de manière sécurisée
     * 
     * Cette méthode route le stockage vers le backend approprié selon la configuration.
     * La clé privée est toujours chiffrée avant stockage (même pour le backend fichier).
     * 
     * ⚠️ SÉCURITÉ : Pour les backends HSM, la clé peut être stockée directement dans le HSM
     * sans être exposée en mémoire. Pour le backend fichier, la clé est chiffrée avec APP_KEY.
     * 
     * @param string $privateKeyPem La clé privée au format PEM
     * @param string $keyId L'identifiant de la clé (pour support de rotation, par défaut: 'current')
     * @return bool True si le stockage a réussi, false sinon
     */
    public function storeCAPrivateKey(string $privateKeyPem, string $keyId = 'current'): bool
    {
        try {
            switch ($this->backend) {
                case 'file':
                    return $this->storeInFile($privateKeyPem, $keyId);
                
                case 'hsm':
                    return $this->storeInHSM($privateKeyPem, $keyId);
                
                case 'aws_cloudhsm':
                    return $this->storeInAWSCloudHSM($privateKeyPem, $keyId);
                
                case 'azure_keyvault':
                    return $this->storeInAzureKeyVault($privateKeyPem, $keyId);
                
                default:
                    Log::error("Backend HSM inconnu : {$this->backend}");
                    return false;
            }
        } catch (\Exception $e) {
            Log::error('Échec du stockage de la clé privée CA : ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Récupère la clé privée de la CA
     * 
     * ⚠️ AVERTISSEMENT DE SÉCURITÉ : Cette méthode expose la clé privée en mémoire.
     * Pour les backends HSM, préférez utiliser signWithCAKey() qui signe sans exposer la clé.
     * 
     * @param string $keyId L'identifiant de la clé (par défaut: 'current')
     * @return string|null La clé privée au format PEM ou null si non trouvée
     */
    public function getCAPrivateKey(string $keyId = 'current'): ?string
    {
        try {
            switch ($this->backend) {
                case 'file':
                    return $this->getFromFile($keyId);
                
                case 'hsm':
                    return $this->getFromHSM($keyId);
                
                case 'aws_cloudhsm':
                    return $this->getFromAWSCloudHSM($keyId);
                
                case 'azure_keyvault':
                    return $this->getFromAzureKeyVault($keyId);
                
                default:
                    Log::error("Backend HSM inconnu : {$this->backend}");
                    return null;
            }
        } catch (\Exception $e) {
            Log::error('Échec de la récupération de la clé privée CA : ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Signe des données avec la clé privée de la CA (sans exposer la clé)
     * 
     * Cette méthode est préférée pour les backends HSM car elle permet de signer
     * sans exposer la clé privée en mémoire. Pour le backend fichier, la clé doit
     * être récupérée et déchiffrée avant signature (moins sécurisé).
     * 
     * @param string $data Les données à signer
     * @param string $keyId L'identifiant de la clé (par défaut: 'current')
     * @return string|null La signature encodée en base64 ou null en cas d'échec
     */
    public function signWithCAKey(string $data, string $keyId = 'current'): ?string
    {
        try {
            // Pour les backends HSM, on peut signer directement sans récupérer la clé
            if ($this->backend === 'hsm' || $this->backend === 'aws_cloudhsm' || $this->backend === 'azure_keyvault') {
                return $this->signWithHSM($data, $keyId);
            }
            
            // Pour le backend fichier, on doit récupérer et signer (moins sécurisé)
            $privateKey = $this->getCAPrivateKey($keyId);
            if (!$privateKey) {
                return null;
            }
            
            return $this->rsaService->sign($data, $privateKey);
        } catch (\Exception $e) {
            Log::error('Échec de la signature avec la clé CA : ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Vérifie si une clé existe
     * 
     * Cette méthode vérifie l'existence d'une clé selon le backend utilisé.
     * Pour le backend fichier, elle vérifie l'existence du fichier.
     * Pour les backends HSM, elle utilise leurs APIs respectives.
     * 
     * @param string $keyId L'identifiant de la clé (par défaut: 'current')
     * @return bool True si la clé existe, false sinon
     */
    public function keyExists(string $keyId = 'current'): bool
    {
        switch ($this->backend) {
            case 'file':
                $path = $this->getKeyPath($keyId);
                return file_exists($path);
            
            case 'hsm':
            case 'aws_cloudhsm':
            case 'azure_keyvault':
                // Pour les backends HSM, vérifier via leurs APIs
                return $this->checkKeyExistsInHSM($keyId);
            
            default:
                return false;
        }
    }

    /**
     * Liste tous les identifiants de clés disponibles (pour support de rotation)
     * 
     * Cette méthode retourne tous les identifiants de clés stockés, ce qui permet
     * de gérer plusieurs versions de clés lors de la rotation.
     * 
     * @return array Tableau des identifiants de clés disponibles
     */
    public function listKeyIds(): array
    {
        switch ($this->backend) {
            case 'file':
                return $this->listFileKeys();
            
            case 'hsm':
            case 'aws_cloudhsm':
            case 'azure_keyvault':
                return $this->listHSMKeys();
            
            default:
                return [];
        }
    }

    // ============================================
    // Stockage basé sur fichier (par défaut, chiffré)
    // ============================================

    /**
     * Stocke la clé privée CA dans un fichier chiffré
     * 
     * Le fichier est chiffré avec la clé d'application Laravel (APP_KEY)
     * et stocké avec des permissions restrictives (0600).
     * 
     * @param string $privateKeyPem La clé privée au format PEM
     * @param string $keyId L'identifiant de la clé
     * @return bool True si le stockage a réussi
     */
    private function storeInFile(string $privateKeyPem, string $keyId): bool
    {
        $path = $this->getKeyPath($keyId);
        $dir = dirname($path);
        
        // Créer le répertoire s'il n'existe pas avec permissions restrictives
        if (!is_dir($dir)) {
            mkdir($dir, 0700, true);
        }
        
        // Chiffrer avec la clé d'application
        $encrypted = $this->rsaService->encryptPrivateKeyWithAppKey($privateKeyPem);
        file_put_contents($path, $encrypted);
        chmod($path, 0600); // Permissions : lecture/écriture pour le propriétaire uniquement
        
        return true;
    }

    /**
     * Récupère la clé privée CA depuis un fichier chiffré
     * 
     * @param string $keyId L'identifiant de la clé
     * @return string|null La clé privée déchiffrée ou null si non trouvée
     */
    private function getFromFile(string $keyId): ?string
    {
        $path = $this->getKeyPath($keyId);
        
        if (!file_exists($path)) {
            return null;
        }
        
        // Lire et déchiffrer la clé
        $encrypted = file_get_contents($path);
        return $this->rsaService->decryptPrivateKeyWithAppKey($encrypted);
    }

    /**
     * Génère le chemin du fichier de clé
     * 
     * @param string $keyId L'identifiant de la clé
     * @return string Le chemin complet du fichier
     */
    private function getKeyPath(string $keyId): string
    {
        $basePath = storage_path('app/ca/keys');
        return "{$basePath}/{$keyId}.encrypted";
    }

    /**
     * Liste toutes les clés stockées dans des fichiers
     * 
     * @return array Tableau des identifiants de clés
     */
    private function listFileKeys(): array
    {
        $basePath = storage_path('app/ca/keys');
        if (!is_dir($basePath)) {
            return [];
        }
        
        $keys = [];
        $files = glob("{$basePath}/*.encrypted");
        foreach ($files as $file) {
            $keyId = basename($file, '.encrypted');
            $keys[] = $keyId;
        }
        
        return $keys;
    }

    // ============================================
    // Stubs backend HSM (à implémenter selon votre fournisseur HSM)
    // ============================================

    /**
     * Stocke la clé privée CA dans un HSM matériel
     * 
     * ⚠️ TODO : Implémenter l'intégration HSM réelle
     * Exemple : Interface PKCS#11
     * 
     * @param string $privateKeyPem La clé privée au format PEM
     * @param string $keyId L'identifiant de la clé
     * @return bool True si le stockage a réussi
     */
    private function storeInHSM(string $privateKeyPem, string $keyId): bool
    {
        // TODO: Implémenter l'intégration HSM réelle
        // Exemple : Interface PKCS#11
        Log::warning('Backend HSM pas entièrement implémenté, utilisation du stockage fichier');
        return $this->storeInFile($privateKeyPem, $keyId);
    }

    /**
     * Récupère la clé privée depuis un HSM
     * 
     * ⚠️ ATTENTION : Un HSM ne devrait pas exposer les clés privées.
     * Utilisez signWithHSM() à la place pour signer sans exposer la clé.
     * 
     * @param string $keyId L'identifiant de la clé
     * @return null Toujours null pour les HSM (les clés ne doivent pas être exposées)
     */
    private function getFromHSM(string $keyId): ?string
    {
        // Un HSM ne devrait pas exposer les clés privées - utiliser signWithHSM à la place
        Log::warning('Le backend HSM ne devrait pas exposer les clés privées');
        return null;
    }

    /**
     * Signe des données avec un HSM sans exposer la clé
     * 
     * ⚠️ TODO : Implémenter la signature HSM
     * Cela utiliserait PKCS#11 ou similaire pour signer sans exposer la clé.
     * 
     * @param string $data Les données à signer
     * @param string $keyId L'identifiant de la clé
     * @return string|null La signature ou null si non implémenté
     */
    private function signWithHSM(string $data, string $keyId): ?string
    {
        // TODO: Implémenter la signature HSM
        // Cela utiliserait PKCS#11 ou similaire pour signer sans exposer la clé
        Log::warning('Signature HSM pas entièrement implémentée');
        return null;
    }

    /**
     * Vérifie si une clé existe dans le HSM
     * 
     * ⚠️ TODO : Implémenter la vérification d'existence de clé HSM
     * 
     * @param string $keyId L'identifiant de la clé
     * @return bool True si la clé existe
     */
    private function checkKeyExistsInHSM(string $keyId): bool
    {
        // TODO: Implémenter la vérification d'existence de clé HSM
        return false;
    }

    /**
     * Liste toutes les clés dans le HSM
     * 
     * ⚠️ TODO : Implémenter la liste des clés HSM
     * 
     * @return array Tableau des identifiants de clés
     */
    private function listHSMKeys(): array
    {
        // TODO: Implémenter la liste des clés HSM
        return [];
    }

    // ============================================
    // Stubs AWS CloudHSM
    // ============================================

    /**
     * Stocke la clé privée CA dans AWS CloudHSM
     * 
     * ⚠️ TODO : Implémenter l'intégration AWS CloudHSM
     * 
     * @param string $privateKeyPem La clé privée au format PEM
     * @param string $keyId L'identifiant de la clé
     * @return bool True si le stockage a réussi
     */
    private function storeInAWSCloudHSM(string $privateKeyPem, string $keyId): bool
    {
        // TODO: Implémenter l'intégration AWS CloudHSM
        Log::warning('Backend AWS CloudHSM non implémenté');
        return false;
    }

    /**
     * Récupère la clé privée depuis AWS CloudHSM
     * 
     * ⚠️ ATTENTION : CloudHSM ne devrait pas exposer les clés privées.
     * 
     * @param string $keyId L'identifiant de la clé
     * @return null Toujours null (les clés ne doivent pas être exposées)
     */
    private function getFromAWSCloudHSM(string $keyId): ?string
    {
        // CloudHSM ne devrait pas exposer les clés privées
        return null;
    }

    // ============================================
    // Stubs Azure Key Vault
    // ============================================

    /**
     * Stocke la clé privée CA dans Azure Key Vault
     * 
     * ⚠️ TODO : Implémenter l'intégration Azure Key Vault
     * 
     * @param string $privateKeyPem La clé privée au format PEM
     * @param string $keyId L'identifiant de la clé
     * @return bool True si le stockage a réussi
     */
    private function storeInAzureKeyVault(string $privateKeyPem, string $keyId): bool
    {
        // TODO: Implémenter l'intégration Azure Key Vault
        Log::warning('Backend Azure Key Vault non implémenté');
        return false;
    }

    /**
     * Récupère la clé privée depuis Azure Key Vault
     * 
     * ⚠️ ATTENTION : Key Vault ne devrait pas exposer les clés privées.
     * 
     * @param string $keyId L'identifiant de la clé
     * @return null Toujours null (les clés ne doivent pas être exposées)
     */
    private function getFromAzureKeyVault(string $keyId): ?string
    {
        // Key Vault ne devrait pas exposer les clés privées
        return null;
    }
}

