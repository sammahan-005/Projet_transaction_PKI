<?php

namespace App\Services;

use Illuminate\Support\Facades\Crypt;

/**
 * Service de gestion des opérations cryptographiques RSA
 * 
 * Ce service fournit toutes les fonctionnalités nécessaires pour :
 * - Générer des paires de clés RSA (publique/privée)
 * - Signer des données avec une clé privée
 * - Vérifier des signatures avec une clé publique
 * - Chiffrer et déchiffrer des clés privées
 * 
 * @package App\Services
 */
class RSAService
{
    /**
     * Génère une paire de clés RSA (publique et privée) en utilisant OpenSSL de PHP
     * 
     * Cette méthode crée une nouvelle paire de clés cryptographiques RSA qui sera utilisée
     * pour signer et vérifier les transactions. La clé publique peut être partagée librement,
     * tandis que la clé privée doit rester secrète et être chiffrée avant stockage.
     * 
     * @param int $keySize Taille de la clé en bits (par défaut: 2048 pour les utilisateurs, 4096 recommandé pour la CA)
     * @return array Tableau contenant 'public_key' et 'private_key' au format PEM
     * @throws \Exception Si la génération de la clé échoue
     */
    public function generateKeyPair(int $keySize = 2048): array
    {
        // Configuration pour la génération de la paire de clés RSA
        $config = [
            'private_key_bits' => $keySize,           // Taille de la clé en bits
            'private_key_type' => OPENSSL_KEYTYPE_RSA, // Type de clé : RSA
        ];

        // Créer une nouvelle ressource de clé privée RSA
        $privateKeyResource = openssl_pkey_new($config);

        // Vérifier que la génération a réussi
        if (!$privateKeyResource) {
            throw new \Exception('Échec de la génération de la clé privée');
        }

        // Extraire la clé privée au format PEM (Privacy-Enhanced Mail)
        // Le format PEM est une représentation textuelle de la clé encodée en base64
        openssl_pkey_export($privateKeyResource, $privateKeyPem);

        // Extraire les détails de la clé publique depuis la ressource
        $publicKeyDetails = openssl_pkey_get_details($privateKeyResource);
        $publicKeyPem = $publicKeyDetails['key'];

        // Retourner les deux clés au format PEM
        return [
            'public_key' => $publicKeyPem,   // Clé publique (peut être partagée)
            'private_key' => $privateKeyPem,  // Clé privée (doit rester secrète)
        ];
    }

    /**
     * Signe un hash de message en utilisant la clé privée RSA
     * 
     * Cette méthode crée une signature numérique du hash fourni en utilisant l'algorithme
     * RSA avec SHA-256. La signature prouve que le détenteur de la clé privée a autorisé
     * la transaction.
     * 
     * @param string $hash Le hash SHA-256 du message à signer (format hexadécimal)
     * @param string $privateKeyPem La clé privée au format PEM
     * @return string La signature encodée en base64
     * @throws \Exception Si la clé privée est invalide ou si la signature échoue
     */
    public function sign(string $hash, string $privateKeyPem): string
    {
        // Charger la clé privée depuis le format PEM
        $privateKey = openssl_pkey_get_private($privateKeyPem);

        // Vérifier que la clé privée est valide
        if (!$privateKey) {
            throw new \Exception('Clé privée invalide');
        }

        // Variable pour stocker la signature binaire
        $signature = '';
        
        // Signer le hash avec la clé privée en utilisant SHA-256
        // openssl_sign() crée une signature RSA du hash fourni
        $success = openssl_sign($hash, $signature, $privateKey, OPENSSL_ALGO_SHA256);

        // Vérifier que la signature a réussi
        if (!$success) {
            throw new \Exception('Échec de la signature des données');
        }

        // Retourner la signature encodée en base64 pour faciliter le stockage et la transmission
        return base64_encode($signature);
    }

    /**
     * Vérifie une signature en utilisant la clé publique RSA
     * 
     * ⚠️ MÉTHODE DÉPRÉCIÉE : Cette méthode accepte un hash au lieu des données originales.
     * Utilisez verifyWithOriginalData() à la place pour une vérification correcte.
     * 
     * IMPORTANT : Le frontend signe maintenant les données de transaction originales (pas le hash).
     * openssl_verify avec OPENSSL_ALGO_SHA256 va hasher l'entrée, donc nous devons passer
     * les données originales, pas le hash.
     * 
     * Cette méthode est conservée pour la rétrocompatibilité mais ne fonctionne pas correctement
     * avec le nouveau système de signature côté client.
     * 
     * @param string $hash Le hash à vérifier (chaîne hexadécimale du frontend) - DÉPRÉCIÉ : devrait être les données originales
     * @param string $signatureBase64 La signature encodée en base64
     * @param string $publicKeyPem La clé publique au format PEM
     * @return bool True si la signature est valide, false sinon
     * @deprecated Utilisez verifyWithOriginalData() à la place
     */
    public function verify(string $hash, string $signatureBase64, string $publicKeyPem): bool
    {
        // Charger la clé publique depuis le format PEM
        $publicKey = openssl_pkey_get_public($publicKeyPem);

        // Vérifier que la clé publique est valide
        if (!$publicKey) {
            throw new \Exception('Clé publique invalide');
        }

        // Décoder la signature depuis le format base64 vers binaire
        $signature = base64_decode($signatureBase64);
        
        // ⚠️ CORRECTION TEMPORAIRE : Tentative de vérifier les octets du hash
        // Cela ne fonctionnera pas correctement car nous vérifions un hash, pas les données originales.
        // La solution appropriée est de changer verify() pour accepter les données de transaction originales.
        $hashBinary = hex2bin($hash);
        
        // Vérifier que la conversion hexadécimale a réussi
        if ($hashBinary === false) {
            \Log::error('Hash hexadécimal invalide pour la vérification', ['hash' => substr($hash, 0, 50)]);
            return false;
        }
        
        // ⚠️ Cela ne fonctionnera pas correctement car nous vérifions un hash, pas les données originales
        // openssl_verify() va hasher à nouveau le hash, ce qui ne correspondra pas à la signature
        $result = openssl_verify($hashBinary, $signature, $publicKey, OPENSSL_ALGO_SHA256);

        // Retourner true uniquement si la vérification a réussi (résultat === 1)
        return $result === 1;
    }
    
    /**
     * Vérifie une signature en utilisant les données de transaction originales (pas le hash)
     * 
     * Cette méthode est la méthode correcte à utiliser lorsque le frontend signe les données
     * originales. Elle correspond au comportement du frontend qui signe directement les données
     * de transaction avant de les envoyer au serveur.
     * 
     * Le processus de vérification :
     * 1. openssl_verify() avec OPENSSL_ALGO_SHA256 va hasher automatiquement les données
     * 2. Il compare ensuite ce hash avec la signature décodée
     * 3. Retourne 1 si la signature est valide, 0 si invalide, -1 en cas d'erreur
     * 
     * @param string $transactionData Les données de transaction originales (chaîne concaténée)
     * @param string $signatureBase64 La signature encodée en base64
     * @param string $publicKeyPem La clé publique au format PEM
     * @return bool True si la signature est valide, false sinon
     * @throws \Exception Si la clé publique est invalide
     */
    public function verifyWithOriginalData(string $transactionData, string $signatureBase64, string $publicKeyPem): bool
    {
        // Nettoyer la signature - supprimer tout espace blanc qui pourrait avoir été ajouté
        $signatureBase64 = trim($signatureBase64);
        
        // Charger la clé publique depuis le format PEM
        $publicKey = openssl_pkey_get_public($publicKeyPem);

        // Vérifier que la clé publique est valide et collecter les erreurs OpenSSL si nécessaire
        if (!$publicKey) {
            $errors = [];
            while ($error = openssl_error_string()) {
                $errors[] = $error;
            }
            \Log::error('Échec du chargement de la clé publique pour la vérification de signature', [
                'errors' => $errors,
                'public_key_preview' => substr($publicKeyPem, 0, 100),
                'public_key_length' => strlen($publicKeyPem),
            ]);
            throw new \Exception('Clé publique invalide : ' . implode('; ', $errors));
        }

        // Décoder la signature depuis le format base64 vers binaire
        // Le paramètre true active le mode strict qui retourne false en cas d'erreur
        $signature = base64_decode($signatureBase64, true);
        
        // Vérifier que le décodage base64 a réussi
        if ($signature === false) {
            \Log::error('Échec du décodage de la signature base64', [
                'signature_length' => strlen($signatureBase64),
                'signature_preview' => substr($signatureBase64, 0, 50),
                'signature_ends_with' => substr($signatureBase64, -10),
            ]);
            openssl_free_key($publicKey); // Libérer la ressource mémoire
            return false;
        }
        
        // Journalisation détaillée pour le débogage
        \Log::info('Vérification de la signature avec OpenSSL', [
            'transaction_data' => $transactionData,
            'transaction_data_length' => strlen($transactionData),
            'transaction_data_hex' => bin2hex($transactionData),
            'signature_base64_length' => strlen($signatureBase64),
            'signature_binary_length' => strlen($signature),
            'public_key_preview' => substr($publicKeyPem, 0, 50),
        ]);
        
        // openssl_verify avec OPENSSL_ALGO_SHA256 va hasher automatiquement les données de transaction
        // et vérifier que le hash correspond à la signature
        // Retourne : 1 = signature valide, 0 = signature invalide, -1 = erreur
        $result = openssl_verify($transactionData, $signature, $publicKey, OPENSSL_ALGO_SHA256);

        // Gérer les différents codes de retour
        if ($result === -1) {
            // Erreur lors de la vérification (problème avec les paramètres ou la clé)
            $errors = [];
            while ($error = openssl_error_string()) {
                $errors[] = $error;
            }
            \Log::error('Erreur de vérification OpenSSL', [
                'errors' => $errors,
                'transaction_data' => $transactionData,
                'transaction_data_length' => strlen($transactionData),
                'transaction_data_hex' => bin2hex($transactionData),
                'signature_length' => strlen($signature),
            ]);
        } elseif ($result === 0) {
            // Signature invalide (les données ne correspondent pas à la signature)
            \Log::warning('OpenSSL a retourné 0 (signature invalide)', [
                'transaction_data' => $transactionData,
                'transaction_data_length' => strlen($transactionData),
                'transaction_data_hex' => bin2hex($transactionData),
                'signature_length' => strlen($signature),
            ]);
        }

        // Libérer la ressource mémoire de la clé publique
        openssl_free_key($publicKey);
        
        // Retourner true uniquement si la vérification a réussi (résultat === 1)
        return $result === 1;
    }

    /**
     * Chiffre une clé privée avec un mot de passe
     * 
     * Cette méthode utilise AES-256-CBC pour chiffrer la clé privée avec un mot de passe.
     * Le vecteur d'initialisation (IV) est généré aléatoirement et inclus dans les données chiffrées.
     * 
     * Format des données chiffrées : base64(IV + données_chiffrées)
     * 
     * @param string $privateKeyPem La clé privée au format PEM à chiffrer
     * @param string $password Le mot de passe utilisé pour le chiffrement
     * @return string Les données chiffrées encodées en base64 (IV + données chiffrées)
     */
    public function encryptPrivateKey(string $privateKeyPem, string $password): string
    {
        // Générer un vecteur d'initialisation (IV) aléatoire de 16 octets pour AES-256-CBC
        $iv = random_bytes(16);
        
        // Créer une clé de chiffrement de 256 bits à partir du mot de passe en utilisant SHA-256
        // Le paramètre true retourne les données binaires brutes au lieu d'une chaîne hexadécimale
        $key = hash('sha256', $password, true);

        // Chiffrer la clé privée avec AES-256-CBC
        // Le paramètre 0 signifie qu'OpenSSL ne gère pas le padding automatiquement (mais le fait quand même)
        $encrypted = openssl_encrypt($privateKeyPem, 'aes-256-cbc', $key, 0, $iv);

        // Retourner l'IV concaténé avec les données chiffrées, le tout encodé en base64
        // L'IV est nécessaire pour déchiffrer les données, donc il doit être stocké avec elles
        return base64_encode($iv . $encrypted);
    }

    /**
     * Déchiffre une clé privée avec un mot de passe
     * 
     * Cette méthode déchiffre une clé privée qui a été chiffrée avec encryptPrivateKey().
     * Elle extrait l'IV des données chiffrées et utilise le même mot de passe pour déchiffrer.
     * 
     * @param string $encryptedData Les données chiffrées encodées en base64 (IV + données chiffrées)
     * @param string $password Le mot de passe utilisé pour le chiffrement
     * @return string|null La clé privée déchiffrée au format PEM, ou null si le déchiffrement échoue
     */
    public function decryptPrivateKey(string $encryptedData, string $password): ?string
    {
        // Décoder les données depuis le format base64
        $data = base64_decode($encryptedData);
        
        // Extraire l'IV (les 16 premiers octets)
        $iv = substr($data, 0, 16);
        
        // Extraire les données chiffrées (tout sauf les 16 premiers octets)
        $encrypted = substr($data, 16);
        
        // Recréer la clé de chiffrement à partir du mot de passe (même processus qu'à l'encryptage)
        $key = hash('sha256', $password, true);

        // Déchiffrer les données avec AES-256-CBC
        $privateKeyPem = openssl_decrypt($encrypted, 'aes-256-cbc', $key, 0, $iv);

        // Vérifier que le déchiffrement a réussi
        if ($privateKeyPem === false) {
            return null;
        }

        return $privateKeyPem;
    }

    /**
     * Chiffre une clé privée en utilisant le système de chiffrement de Laravel (clé d'application)
     * 
     * Cette méthode utilise la clé de chiffrement de l'application Laravel (APP_KEY) pour chiffrer
     * la clé privée. Cette approche est plus simple que le chiffrement par mot de passe car elle
     * ne nécessite pas de gérer un mot de passe séparé.
     * 
     * ⚠️ SÉCURITÉ : La clé APP_KEY doit être gardée secrète et ne jamais être exposée.
     * 
     * @param string $privateKeyPem La clé privée au format PEM à chiffrer
     * @return string La clé privée chiffrée (format Laravel Crypt)
     */
    public function encryptPrivateKeyWithAppKey(string $privateKeyPem): string
    {
        // Utiliser le système de chiffrement de Laravel qui utilise APP_KEY
        return Crypt::encryptString($privateKeyPem);
    }

    /**
     * Déchiffre une clé privée en utilisant le système de chiffrement de Laravel (clé d'application)
     * 
     * Cette méthode déchiffre une clé privée qui a été chiffrée avec encryptPrivateKeyWithAppKey().
     * Elle détecte également si la clé est dans l'ancien format (chiffré par mot de passe) et
     * fournit des messages d'erreur utiles.
     * 
     * @param string $encryptedData Les données chiffrées (format Laravel Crypt ou ancien format)
     * @return string|null La clé privée déchiffrée au format PEM, ou null si le déchiffrement échoue
     */
    public function decryptPrivateKeyWithAppKey(string $encryptedData): ?string
    {
        try {
            // Tenter de déchiffrer avec le système Laravel Crypt
            $decrypted = Crypt::decryptString($encryptedData);
            
            // Valider que nous avons obtenu une clé PEM valide
            if ($this->isValidPrivateKeyPem($decrypted)) {
                return $decrypted;
            }
            
            // Les données déchiffrées ne ressemblent pas à une clé PEM valide
            \Log::warning('Les données déchiffrées ne semblent pas être une clé privée PEM valide');
            return null;
            
        } catch (\Illuminate\Contracts\Encryption\DecryptException $e) {
            // Incompatibilité de format Laravel Crypt - pourrait être un format chiffré par mot de passe
            $isPasswordEncryptedFormat = $this->isPasswordEncryptedFormat($encryptedData);
            
            \Log::error('Échec du déchiffrement Laravel Crypt', [
                'error' => $e->getMessage(),
                'data_length' => strlen($encryptedData),
                'is_password_encrypted_format' => $isPasswordEncryptedFormat,
                'data_preview' => substr($encryptedData, 0, 100),
            ]);
            
            return null;
        } catch (\Exception $e) {
            // Autres erreurs de chiffrement
            \Log::error('Erreur de déchiffrement de la clé privée', [
                'error' => $e->getMessage(),
                'class' => get_class($e),
                'trace' => $e->getTraceAsString(),
            ]);
            return null;
        }
    }
    
    /**
     * Vérifie si les données chiffrées semblent être au format chiffré par mot de passe
     * 
     * Le format chiffré par mot de passe est : base64(IV + données_chiffrées)
     * où IV fait 16 octets. Donc les données décodées devraient faire au moins 16 octets.
     * 
     * @param string $encryptedData Les données chiffrées à vérifier
     * @return bool True si les données semblent être au format chiffré par mot de passe
     */
    private function isPasswordEncryptedFormat(string $encryptedData): bool
    {
        // Format chiffré par mot de passe : base64(IV + données_chiffrées)
        // Devrait décoder en au moins 16 octets (taille de l'IV)
        try {
            $decoded = base64_decode($encryptedData, true);
            return $decoded !== false && strlen($decoded) > 16;
        } catch (\Exception $e) {
            return false;
        }
    }
    
    /**
     * Vérifie si une chaîne est une clé privée PEM valide
     * 
     * Une clé PEM valide doit contenir :
     * - "-----BEGIN" au début
     * - "PRIVATE KEY" quelque part dans le contenu
     * - "-----END" à la fin
     * 
     * @param string $data La chaîne à vérifier
     * @return bool True si la chaîne semble être une clé privée PEM valide
     */
    private function isValidPrivateKeyPem(string $data): bool
    {
        return strpos($data, '-----BEGIN') !== false 
            && strpos($data, 'PRIVATE KEY') !== false
            && strpos($data, '-----END') !== false;
    }
}
