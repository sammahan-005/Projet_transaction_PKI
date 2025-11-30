<?php

namespace App\Services;

use App\Models\Certificate;
use App\Models\Transaction;
use App\Models\Account;

/**
 * Service de gestion de l'infrastructure à clés publiques (PKI)
 * 
 * Ce service gère la génération, la validation et la vérification des certificats PKI
 * pour les transactions. Il agit comme une couche d'abstraction entre les transactions
 * et l'autorité de certification (CA) tierce partie.
 * 
 * Fonctionnalités principales :
 * - Génération de certificats PKI pour les transactions validées
 * - Vérification de certificats avec la clé publique de la CA
 * - Extraction et gestion des empreintes de clés publiques
 * - Formatage des certificats au format PEM
 * 
 * @package App\Services
 */
class PKIService
{
    /** @var RSAService Service de gestion des opérations cryptographiques RSA */
    protected RSAService $rsaService;
    
    /** @var CAService Service de gestion de l'autorité de certification */
    protected CAService $caService;

    /**
     * Constructeur du service PKI
     * 
     * @param RSAService $rsaService Service RSA pour les opérations cryptographiques
     * @param CAService $caService Service CA pour la gestion de l'autorité de certification
     */
    public function __construct(RSAService $rsaService, CAService $caService)
    {
        $this->rsaService = $rsaService;
        $this->caService = $caService;
    }

    /**
     * Génère un certificat PKI pour une transaction signé par l'autorité de certification (CA) tierce partie
     * 
     * 🔐 SÉCURITÉ : Les certificats sont signés par la CA de la plateforme (tierce partie), pas par les utilisateurs.
     * La CA est une entité indépendante qui :
     * - Vérifie les détails des transactions
     * - Émet des certificats pour les transactions valides
     * - Signe les certificats avec sa propre clé privée
     * 
     * Cela garantit une chaîne de confiance PKI appropriée et évite les problèmes de certificats auto-signés.
     * 
     * Processus :
     * 1. Vérification que la CA est initialisée
     * 2. Génération d'un numéro de série unique
     * 3. Extraction des empreintes des clés publiques (expéditeur et destinataire)
     * 4. Construction des données du certificat (issuer, subject, métadonnées)
     * 5. Signature du certificat avec la clé privée de la CA
     * 6. Création et enregistrement du certificat en base de données
     * 
     * @param Transaction $transaction La transaction pour laquelle créer un certificat
     * @param string $senderPublicKeyPem La clé publique de l'expéditeur (générée à la création du compte)
     * @param string $receiverPublicKeyPem La clé publique du destinataire (générée à la création du compte)
     * @return Certificate Le certificat généré signé avec la clé privée de la CA tierce partie
     * @throws \Exception Si la CA n'est pas initialisée
     */
    public function generateTransactionCertificate(
        Transaction $transaction,
        string $senderPublicKeyPem,
        string $receiverPublicKeyPem
    ): Certificate {
        // Vérifier que la CA est initialisée avant de générer un certificat
        if (!$this->caService->caKeysExist()) {
            throw new \Exception('Autorité de Certification non initialisée. Veuillez exécuter la commande d\'initialisation de la CA.');
        }

        // Générer un numéro de série unique pour ce certificat (identifiant unique)
        $serialNumber = $this->generateSerialNumber();

        // Extraire les empreintes des clés publiques (hash SHA-256 de la clé publique)
        // L'empreinte permet d'identifier de manière unique une clé publique
        $senderKeyFingerprint = $this->getPublicKeyFingerprint($senderPublicKeyPem);
        $receiverKeyFingerprint = $this->getPublicKeyFingerprint($receiverPublicKeyPem);

        // Récupérer les informations de la CA tierce partie
        $caInfo = $this->caService->getCAInfo();
        $caPublicKey = $caInfo['public_key'];              // Clé publique de la CA
        $caFingerprint = $caInfo['public_key_fingerprint']; // Empreinte de la clé publique de la CA

        // Construire le nom distingué (DN) de l'émetteur (toujours la CA tierce partie)
        $issuer = $caInfo['distinguished_name'] ?? $this->buildCAIssuer($caInfo);

        // Construire le nom distingué (DN) du sujet (transaction + informations des clés publiques)
        $subject = $this->buildSubjectFromTransaction($transaction, $senderPublicKeyPem, $receiverPublicKeyPem, $senderKeyFingerprint, $receiverKeyFingerprint);

        // Construire les données du certificat à signer (format JSON)
        $certificateData = $this->buildCertificateData([
            'version' => 3,                                    // Version du certificat X.509
            'serial_number' => $serialNumber,                  // Numéro de série unique
            'issuer' => $issuer,                               // Émetteur (CA)
            'subject' => $subject,                             // Sujet (transaction)
            'valid_from' => now()->toIso8601String(),          // Date de début de validité
            'valid_to' => now()->addYear()->toIso8601String(), // Date d'expiration (1 an)
            'transaction' => [
                'id' => $transaction->id,
                'hash' => $transaction->transaction_hash,
                'amount' => $transaction->amount,
                'timestamp' => $transaction->created_at->toIso8601String(),
            ],
            'sender_public_key' => $senderPublicKeyPem,         // Clé publique de l'expéditeur
            'receiver_public_key' => $receiverPublicKeyPem,     // Clé publique du destinataire
            'sender_key_fingerprint' => $senderKeyFingerprint,  // Empreinte de la clé de l'expéditeur
            'receiver_key_fingerprint' => $receiverKeyFingerprint, // Empreinte de la clé du destinataire
            'ca_public_key_fingerprint' => $caFingerprint,      // Empreinte de la clé publique de la CA
            'algorithm' => 'RSA-4096 with SHA-256 (CA signed)',  // Algorithme de signature
        ]);

        // Signer le certificat avec la clé privée de la CA tierce partie (pas la clé privée de l'expéditeur)
        // C'est l'approche PKI appropriée :
        // - La CA tierce partie signe les certificats (établit la confiance)
        // - Les utilisateurs signent les transactions (prouve l'autorisation)
        // Utiliser signWithCAKey() qui supporte la signature HSM sans exposer la clé
        $signature = $this->caService->signWithCAKey($certificateData);

        // Créer et enregistrer le certificat en base de données
        return Certificate::create([
            'transaction_id' => $transaction->id,
            'certificate_data' => $this->formatCertificate($certificateData, $signature, $caPublicKey),
            'serial_number' => $serialNumber,
            'issued_at' => now(),                              // Date d'émission
            'expires_at' => now()->addYear(),                  // Date d'expiration
            'issuer' => $issuer,                               // Émetteur
            'subject' => $subject,                             // Sujet
            'signature' => $signature,                         // Signature de la CA
        ]);
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
     * Construit le nom distingué (DN) de l'émetteur à partir des informations de la CA
     * 
     * L'émetteur est toujours la CA de la plateforme. Le nom distingué est utilisé
     * dans les certificats X.509 pour identifier l'autorité qui a émis le certificat.
     * 
     * Format : "CN=Nom, O=Organisation, OU=Unité, C=Pays"
     * 
     * @param array $caInfo Tableau contenant les informations de la CA
     * @return string Le nom distingué de l'émetteur au format X.509
     */
    private function buildCAIssuer(array $caInfo): string
    {
        return sprintf(
            "CN=%s, O=%s, OU=Certificate Authority, C=Platform",
            $caInfo['name'],
            $caInfo['organization']
        );
    }

    /**
     * Construit le nom distingué (DN) du sujet à partir de la transaction et des clés publiques des deux parties
     * 
     * Le sujet identifie la transaction et les parties impliquées dans le certificat.
     * Il contient l'ID de la transaction, les tailles des clés et les empreintes partielles.
     * 
     * @param Transaction $transaction La transaction concernée
     * @param string $senderPublicKeyPem La clé publique de l'expéditeur
     * @param string $receiverPublicKeyPem La clé publique du destinataire
     * @param string $senderFingerprint L'empreinte de la clé de l'expéditeur
     * @param string $receiverFingerprint L'empreinte de la clé du destinataire
     * @return string Le nom distingué du sujet au format X.509
     */
    private function buildSubjectFromTransaction(
        Transaction $transaction,
        string $senderPublicKeyPem,
        string $receiverPublicKeyPem,
        string $senderFingerprint,
        string $receiverFingerprint
    ): string {
        // Extraire les détails des clés publiques pour obtenir leur taille
        $senderKeyDetails = openssl_pkey_get_details(openssl_pkey_get_public($senderPublicKeyPem));
        $receiverKeyDetails = openssl_pkey_get_details(openssl_pkey_get_public($receiverPublicKeyPem));
        
        // Récupérer la taille des clés (par défaut 2048 bits si non trouvée)
        $senderKeySize = $senderKeyDetails['bits'] ?? 2048;
        $receiverKeySize = $receiverKeyDetails['bits'] ?? 2048;

        // Construire le DN avec l'ID de transaction, les tailles de clés et les empreintes partielles
        return sprintf(
            "CN=Transaction #%d, OU=Sender RSA-%d %s / Receiver RSA-%d %s, O=Pipocoin Network",
            $transaction->id,
            $senderKeySize,
            substr($senderFingerprint, 0, 12),  // 12 premiers caractères de l'empreinte
            $receiverKeySize,
            substr($receiverFingerprint, 0, 12) // 12 premiers caractères de l'empreinte
        );
    }

    /**
     * Vérifie un certificat de transaction en utilisant la clé publique de la CA tierce partie
     * 
     * 🔐 SÉCURITÉ : Les certificats sont vérifiés avec la clé publique de la CA tierce partie, pas avec les clés utilisateurs.
     * Cela garantit que le certificat a été émis par l'Autorité de Certification de confiance tierce partie.
     * 
     * Processus de vérification :
     * 1. Récupération de la clé publique de la CA
     * 2. Extraction des données du certificat (sans signature)
     * 3. Vérification de la signature avec la clé publique de la CA
     * 4. Vérification que le certificat n'a pas expiré
     * 5. Vérification que l'émetteur correspond à la CA
     * 
     * @param Certificate $certificate Le certificat à vérifier
     * @return bool True si le certificat est valide, false sinon
     */
    public function verifyCertificate(Certificate $certificate): bool
    {
        try {
            // Récupérer la clé publique de la CA
            $caPublicKey = $this->caService->getCAPublicKey();

            // Extraire les données du certificat (sans signature)
            $certificateData = $this->extractCertificateData($certificate->certificate_data);

            // Vérifier la signature en utilisant la clé publique de la CA (pas la clé publique de l'utilisateur)
            $signatureValid = $this->rsaService->verify($certificateData, $certificate->signature, $caPublicKey);

            if (!$signatureValid) {
                return false;
            }

            // Vérifier que le certificat n'a pas expiré
            if ($certificate->expires_at < now()) {
                return false;
            }

            // Vérifier que le certificat a été émis par la CA (vérifier le champ issuer)
            $certData = json_decode($certificateData, true);
            if (isset($certData['issuer'])) {
                $issuer = $certData['issuer'];
                $caInfo = $this->caService->getCAInfo();
                $expectedIssuer = $this->buildCAIssuer($caInfo);
                
                // Vérifier que l'émetteur correspond à la CA
                if ($issuer !== $expectedIssuer) {
                    return false;
                }
            }

            return true;
        } catch (\Exception $e) {
            \Log::error('Échec de la vérification du certificat : ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Génère un numéro de série unique pour le certificat
     * 
     * Le numéro de série est généré à partir de 16 octets aléatoires (128 bits)
     * et converti en hexadécimal en majuscules. Cela garantit un identifiant unique
     * pour chaque certificat.
     * 
     * @return string Le numéro de série unique en hexadécimal (32 caractères)
     */
    private function generateSerialNumber(): string
    {
        return strtoupper(bin2hex(random_bytes(16)));
    }

    /**
     * Construit les données du certificat à signer
     * 
     * Les données sont encodées en JSON avec formatage lisible pour faciliter
     * le débogage et l'inspection.
     * 
     * @param array $data Tableau contenant les données du certificat
     * @return string Les données du certificat encodées en JSON
     */
    private function buildCertificateData(array $data): string
    {
        return json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Formate le certificat avec la signature au format PEM-like
     * 
     * Le format PEM inclut :
     * - Les données du certificat (base64)
     * - La signature de la CA (base64)
     * - La clé publique de la CA (pour vérification)
     * 
     * Ce format facilite la vérification et l'inspection des certificats.
     * 
     * @param string $data Les données du certificat (JSON)
     * @param string $signature La signature de la CA (base64)
     * @param string $caPublicKey La clé publique de la CA (format PEM)
     * @return string Le certificat formaté au format PEM-like
     */
    private function formatCertificate(string $data, string $signature, string $caPublicKey): string
    {
        // Section certificat (données encodées en base64)
        $certificate = "-----BEGIN CERTIFICATE-----\n";
        $certificate .= chunk_split(base64_encode($data), 64, "\n");
        $certificate .= "-----END CERTIFICATE-----\n\n";

        // Section signature (signature de la CA encodée en base64)
        $certificate .= "-----BEGIN SIGNATURE (CA)-----\n";
        $certificate .= chunk_split($signature, 64, "\n");
        $certificate .= "-----END SIGNATURE (CA)-----\n\n";

        // Section clé publique CA (pour vérification)
        $certificate .= "-----BEGIN CA PUBLIC KEY-----\n";
        $certificate .= str_replace(
            ["-----BEGIN PUBLIC KEY-----", "-----END PUBLIC KEY-----", "\n\n"],
            ["", "", "\n"],
            $caPublicKey
        );
        $certificate .= "-----END CA PUBLIC KEY-----\n";

        return $certificate;
    }

    /**
     * Extrait les données du certificat sans la signature
     * 
     * Cette méthode parse le format PEM pour extraire uniquement les données
     * du certificat (sans la signature et la clé publique CA).
     * 
     * @param string $certificatePem Le certificat au format PEM
     * @return string Les données du certificat décodées (JSON)
     * @throws \Exception Si le format du certificat est invalide
     */
    private function extractCertificateData(string $certificatePem): string
    {
        // Extraire la section CERTIFICATE du format PEM
        preg_match('/-----BEGIN CERTIFICATE-----(.*?)-----END CERTIFICATE-----/s', $certificatePem, $matches);
        if (!isset($matches[1])) {
            throw new \Exception('Format de certificat invalide');
        }
        // Décoder depuis base64
        return base64_decode(trim($matches[1]));
    }

    /**
     * Crée une demande de signature de certificat (CSR) pour une transaction
     * 
     * Un CSR (Certificate Signing Request) contient les informations nécessaires
     * pour demander un certificat à la CA. Cette méthode génère un CSR au format JSON.
     * 
     * @param Transaction $transaction La transaction concernée
     * @param string $publicKeyPem La clé publique à certifier
     * @return string Le CSR au format JSON
     */
    public function createCSR(Transaction $transaction, string $publicKeyPem): string
    {
        // Calculer l'empreinte de la clé publique
        $fingerprint = $this->getPublicKeyFingerprint($publicKeyPem);

        // Construire les données du CSR
        $csrData = [
            'transaction_id' => $transaction->id,
            'public_key_fingerprint' => $fingerprint,
            'timestamp' => now()->toIso8601String(),
            'transaction_hash' => $transaction->transaction_hash,
            'public_key' => $publicKeyPem,
        ];

        return json_encode($csrData, JSON_PRETTY_PRINT);
    }

    /**
     * Extrait la clé publique depuis un certificat
     * 
     * Cette méthode parse le format PEM du certificat pour extraire
     * la clé publique incluse dans le certificat.
     * 
     * @param string $certificatePem Le certificat au format PEM
     * @return string|null La clé publique au format PEM, ou null si non trouvée
     */
    public function extractPublicKeyFromCertificate(string $certificatePem): ?string
    {
        // Extraire la section PUBLIC KEY du format PEM
        preg_match('/-----BEGIN PUBLIC KEY-----(.*?)-----END PUBLIC KEY-----/s', $certificatePem, $matches);
        if (!isset($matches[0])) {
            return null;
        }
        return $matches[0];
    }

    /**
     * Récupère l'instance CAService (pour accéder aux informations de la CA)
     * 
     * Cette méthode permet d'accéder au service CA depuis l'extérieur
     * de la classe, utile pour les opérations avancées.
     * 
     * @return CAService L'instance du service CA
     */
    public function getCAService(): CAService
    {
        return $this->caService;
    }
}
