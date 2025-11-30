<?php

namespace App\Services;

use App\Models\CertificateAuthority;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

/**
 * Service de gestion de l'Autorité de Certification (CA)
 * 
 * Gère la plateforme en tant qu'Autorité de Certification (CA) tierce partie.
 * La CA est une entité indépendante qui émet et signe les certificats pour les transactions.
 * 
 * La CA fonctionne séparément des utilisateurs :
 * - Les utilisateurs génèrent leurs propres clés (côté client)
 * - Les utilisateurs signent les transactions avec leurs clés privées
 * - La CA signe les certificats avec sa propre clé privée (stockée via HSMService)
 * 
 * 🔐 SÉCURITÉ : Utilise l'abstraction HSMService pour le stockage sécurisé des clés.
 * Peut être configuré pour utiliser de vrais HSM en production.
 * 
 * @package App\Services
 */
class CAService
{
    /** @var RSAService Service de gestion des opérations cryptographiques RSA */
    protected RSAService $rsaService;
    
    /** @var HSMService Service de gestion du module de sécurité matériel (HSM) */
    protected HSMService $hsmService;
    
    /** @var string Chemin vers le fichier de la clé publique de la CA */
    protected string $caPublicKeyPath;

    /**
     * Constructeur du service CA
     * 
     * Initialise les dépendances nécessaires et définit le chemin de stockage
     * de la clé publique de la CA.
     * 
     * @param RSAService $rsaService Service RSA pour la génération de clés
     * @param HSMService $hsmService Service HSM pour le stockage sécurisé de la clé privée
     */
    public function __construct(RSAService $rsaService, HSMService $hsmService)
    {
        $this->rsaService = $rsaService;
        $this->hsmService = $hsmService;
        $this->caPublicKeyPath = storage_path('app/ca/public_key.pem');
    }

    /**
     * Initialise l'Autorité de Certification en tant qu'entité tierce partie
     * 
     * Cette méthode est executée une seule fois lors de la configuration de la plateforme.
     * Elle génère une paire de clés RSA 4096 bits (plus forte que les clés utilisateurs de 2048 bits qui peut casser avec le quantique)
     * et configure la CA pour signer les certificats de transaction.
     * 
     * Processus :
     * 1. Vérification que les clés CA n'existent pas déjà
     * 2. Génération d'une paire de clés RSA 4096 bits
     * 3. Création du répertoire de stockage CA
     * 4. Stockage de la clé publique 
     * 5. Stockage de la clé privée via HSMService (Local storage mais nous devrions songer A utiliser les puces HSM des appareils)
     * 6. Calcul de l'empreinte et de la taille de la clé
     * 7. Création de l'entité CA en base de données
     * 
     * @param array $caInfo Informations de la CA (nom, organisation, etc.)
     * @return CertificateAuthority L'entité CA créée
     * @throws \Exception Si les clés CA existent déjà
     */
    public function initializeCA(array $caInfo = []): CertificateAuthority
    {
        // Vérifier que les clés CA n'existent pas déjà
        if ($this->caKeysExist()) {
            throw new \Exception('Les clés CA existent déjà. Utilisez regenerateCA() pour les régénérer.');
        }

        // Générer une paire de clés CA (4096 bits pour la CA - plus forte que les clés utilisateurs)
        // Note : Utilise RSAService qui supporte des tailles de clés configurables
        $caKeyPair = $this->rsaService->generateKeyPair(4096);

        // Créer le répertoire CA s'il n'existe pas
        $caDir = storage_path('app/ca');
        if (!is_dir($caDir)) {
            mkdir($caDir, 0700, true); // Permissions 0700 : lecture/écriture/exécution pour le propriétaire uniquement
        }

        // Stocker la clé publique 
        file_put_contents($this->caPublicKeyPath, $caKeyPair['public_key']);
        chmod($this->caPublicKeyPath, 0644); // Permissions 0644 : lecture pour tous, écriture pour le propriétaire

        // Stocker la clé privée via HSMService (supporte HSM, fichier, cloud HSM)
        // La clé privée est chiffrée et stockée de manière sécurisée
        $this->hsmService->storeCAPrivateKey($caKeyPair['private_key'], 'current');

        // Calculer l'empreinte de la clé publique (hash SHA-256)
        $fingerprint = $this->getPublicKeyFingerprint($caKeyPair['public_key']);
        $keySize = $this->getKeySize($caKeyPair['public_key']);

        // Créer l'enregistrement de l'entité CA en base de données
        $ca = CertificateAuthority::createOrUpdateCA(array_merge([
            'name' => $caInfo['name'] ?? 'Pipocoin Platform Certificate Authority',
            'organization' => $caInfo['organization'] ?? 'Pipocoin Platform',
            'organizational_unit' => $caInfo['organizational_unit'] ?? 'Certificate Authority',
            'country' => $caInfo['country'] ?? 'XX',
            'email' => $caInfo['email'] ?? 'ca@pipocoin.platform',
            'public_key' => $caKeyPair['public_key'],
            'public_key_fingerprint' => $fingerprint,
            'key_size' => $keySize,
        ], $caInfo));

        // Journaliser l'initialisation réussie
        Log::info('Autorité de Certification initialisée avec succès', [
            'ca_id' => $ca->id,
            'name' => $ca->name,
            'fingerprint' => $fingerprint,
        ]);

        return $ca;
    }

    /**
     * Récupère la clé publique de la CA
     * 
     * La clé publique est stockée dans un fichier et peut être partagée librement.
     * Elle est utilisée pour vérifier les signatures des certificats émis par la CA.
     * 
     * @return string La clé publique au format PEM
     * @throws \Exception Si la clé publique n'est pas trouvée
     */
    public function getCAPublicKey(): string
    {
        if (!file_exists($this->caPublicKeyPath)) {
            throw new \Exception('Clé publique CA non trouvée. Veuillez initialiser les clés CA d\'abord.');
        }

        return file_get_contents($this->caPublicKeyPath);
    }

    /**
     * Récupère la clé privée de la CA (déchiffrée)
     * 
     * ⚠️ AVERTISSEMENT DE SÉCURITÉ : Cette méthode récupère la clé privée de la CA depuis le HSM.
     * Pour les backends HSM, préférez utiliser signWithCAKey() à la place pour éviter
     * d'exposer la clé privée en mémoire.
     * 
     * @return string La clé privée déchiffrée au format PEM
     * @throws \Exception Si la clé privée n'est pas trouvée ou ne peut pas être récupérée
     */
    public function getCAPrivateKey(): string
    {
        if (!$this->caKeysExist()) {
            throw new \Exception('Clé privée CA non trouvée. Veuillez initialiser les clés CA d\'abord.');
        }

        // Récupérer la clé privée depuis le HSM (déchiffrée)
        $privateKey = $this->hsmService->getCAPrivateKey('current');

        if (!$privateKey) {
            throw new \Exception('Échec de la récupération de la clé privée CA depuis le HSM.');
        }

        return $privateKey;
    }

    /**
     * Signe des données avec la clé privée de la CA (sans exposer la clé)
     * 
     * Cette méthode est préférée pour les backends HSM car elle permet de signer
     * sans exposer la clé privée en mémoire. Si le HSM ne supporte pas la signature
     * directe, elle fait un fallback vers la récupération de la clé.
     * 
     * @param string $data Les données à signer
     * @return string La signature encodée en base64
     */
    public function signWithCAKey(string $data): string
    {
        // Tenter de signer directement avec le HSM (méthode préférée)
        $signature = $this->hsmService->signWithCAKey($data, 'current');
        
        if (!$signature) {
            // Fallback : récupérer la clé si la signature HSM n'est pas disponible
            $privateKey = $this->getCAPrivateKey();
            return $this->rsaService->sign($data, $privateKey);
        }
        
        return $signature;
    }

    /**
     * Vérifie si les clés CA existent
     * 
     * Vérifie à la fois la présence de la clé publique (fichier) et de la clé privée (HSM).
     * 
     * @return bool True si les deux clés existent, false sinon
     */
    public function caKeysExist(): bool
    {
        return file_exists($this->caPublicKeyPath) && $this->hsmService->keyExists('current');
    }

    /**
     * Récupère l'entité CA (Autorité de Certification tierce partie)
     * 
     * @return CertificateAuthority L'entité CA active
     * @throws \Exception Si la CA n'est pas initialisée
     */
    public function getCAEntity(): CertificateAuthority
    {
        $ca = CertificateAuthority::getActiveCA();
        
        if (!$ca) {
            throw new \Exception('Autorité de Certification non initialisée. Veuillez exécuter la commande d\'initialisation de la CA.');
        }

        return $ca;
    }

    /**
     * Récupère les informations du certificat CA
     * 
     * Retourne un tableau contenant toutes les informations sur la CA tierce partie,
     * incluant le nom, l'organisation, la clé publique, l'empreinte, etc.
     * 
     * @return array Tableau d'informations sur la CA
     */
    public function getCAInfo(): array
    {
        $ca = $this->getCAEntity();
        return $ca->getCAInfo();
    }

    /**
     * Calcule l'empreinte SHA-256 d'une clé publique
     * 
     * L'empreinte est utilisée pour identifier de manière unique une clé publique.
     * Format : hash SHA-256 en hexadécimal, séparé par des deux-points (format OpenSSL).
     * 
     * @param string $publicKeyPem La clé publique au format PEM
     * @return string L'empreinte au format hexadécimal séparé par deux-points (ex: "AA:BB:CC:...")
     */
    private function getPublicKeyFingerprint(string $publicKeyPem): string
    {
        // Supprimer les en-têtes et pieds de page PEM et les espaces
        $keyContent = preg_replace('/-----[^-]+-----/', '', $publicKeyPem);
        $keyContent = str_replace(["\n", "\r", " "], '', $keyContent);
        
        // Générer le hash SHA-256 de la clé décodée
        $fingerprint = hash('sha256', base64_decode($keyContent));
        
        // Formater comme les empreintes OpenSSL (hexadécimal séparé par deux-points)
        return strtoupper(implode(':', str_split($fingerprint, 2)));
    }

    /**
     * Récupère la taille de la clé en bits
     * 
     * @param string $publicKeyPem La clé publique au format PEM (Privacy-Enhanced Mail)
     * @return int La taille de la clé en bits (ex: 2048, 4096)
     */
    private function getKeySize(string $publicKeyPem): int
    {
        $keyDetails = openssl_pkey_get_details(openssl_pkey_get_public($publicKeyPem));
        return $keyDetails['bits'] ?? 0;
    }
}

