/**
 * Utilitaires cryptographiques côté client
 * 
 * Utilise l'API Web Crypto pour la génération de clés et la signature.
 * 
 * 🔐 SÉCURITÉ CRITIQUE : Les clés privées ne quittent JAMAIS le client.
 * Seules les clés publiques sont envoyées au serveur.
 * 
 * Ce module fournit toutes les fonctionnalités cryptographiques nécessaires
 * pour signer les transactions côté client avant de les envoyer au serveur.
 */

/**
 * Génère une paire de clés RSA en utilisant l'API Web Crypto
 * 
 * Cette fonction génère une nouvelle paire de clés RSA qui sera utilisée
 * pour signer les transactions. La clé privée reste sur le client, seule
 * la clé publique est envoyée au serveur lors de la création du compte.
 * 
 * @param keySize Taille de la clé en bits (par défaut: 2048)
 * @returns Promise qui se résout avec la paire de clés (publique/privée) au format PEM
 * @throws Error Si la génération de la clé échoue
 */
export async function generateKeyPair(keySize: number = 2048): Promise<{
  publicKey: string;
  privateKey: string;
  publicKeyPem: string;
  privateKeyPem: string;
}> {
  try {
    // Generate key pair using Web Crypto API
    // Using RSASSA-PKCS1-v1_5 to match backend's OPENSSL_ALGO_SHA256
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: keySize,
        publicExponent: new Uint8Array([1, 0, 1]), // 65537
        hash: 'SHA-256',
      },
      true, // extractable
      ['sign', 'verify']
    );

    // Export keys to PEM format
    const publicKeyPem = await exportPublicKeyToPem(keyPair.publicKey);
    const privateKeyPem = await exportPrivateKeyToPem(keyPair.privateKey);

    // Also export in JWK format for storage
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

    return {
      publicKey: JSON.stringify(publicKeyJwk),
      privateKey: JSON.stringify(privateKeyJwk),
      publicKeyPem,
      privateKeyPem,
    };
  } catch (error) {
    console.error('Key generation failed:', error);
    throw new Error('Failed to generate key pair: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Exporte une clé publique au format PEM
 * 
 * Le format PEM (Privacy-Enhanced Mail) est un format textuel standard
 * pour représenter les clés cryptographiques encodées en base64.
 * 
 * @param key La clé publique CryptoKey à exporter
 * @returns La clé publique au format PEM
 */
async function exportPublicKeyToPem(key: CryptoKey): Promise<string> {
  // Exporter la clé au format SPKI (SubjectPublicKeyInfo)
  const exported = await crypto.subtle.exportKey('spki', key);
  const exportedAsBase64 = arrayBufferToBase64(exported);
  
  // Formater en PEM avec en-têtes et sauts de ligne tous les 64 caractères
  return `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64.match(/.{1,64}/g)?.join('\n') || ''}\n-----END PUBLIC KEY-----`;
}

/**
 * Exporte une clé privée au format PEM
 * 
 * ⚠️ SÉCURITÉ : Cette fonction exporte la clé privée en texte clair.
 * Assurez-vous de la chiffrer avant de la stocker.
 * 
 * @param key La clé privée CryptoKey à exporter
 * @returns La clé privée au format PEM
 */
async function exportPrivateKeyToPem(key: CryptoKey): Promise<string> {
  // Exporter la clé au format PKCS8 (Private-Key Information Syntax Standard)
  const exported = await crypto.subtle.exportKey('pkcs8', key);
  const exportedAsBase64 = arrayBufferToBase64(exported);
  
  // Formater en PEM avec en-têtes et sauts de ligne tous les 64 caractères
  return `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64.match(/.{1,64}/g)?.join('\n') || ''}\n-----END PRIVATE KEY-----`;
}

/**
 * Import private key from PEM format
 */
export async function importPrivateKeyFromPem(pem: string): Promise<CryptoKey> {
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = pem
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');
  const binaryDer = base64ToArrayBuffer(pemContents);

  return await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    true,
    ['sign']
  );
}

/**
 * Import public key from PEM format
 */
export async function importPublicKeyFromPem(pem: string): Promise<CryptoKey> {
  const pemHeader = '-----BEGIN PUBLIC KEY-----';
  const pemFooter = '-----END PUBLIC KEY-----';
  const pemContents = pem
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');
  const binaryDer = base64ToArrayBuffer(pemContents);

  return await crypto.subtle.importKey(
    'spki',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    true,
    ['verify']
  );
}

/**
 * Signe des données avec une clé privée RSA
 * 
 * Cette fonction crée une signature numérique des données fournies en utilisant
 * l'algorithme RSASSA-PKCS1-v1_5 avec SHA-256. La signature prouve que le détenteur
 * de la clé privée a autorisé les données.
 * 
 * @param data Les données à signer (chaîne ou ArrayBuffer)
 * @param privateKeyPem La clé privée au format PEM
 * @returns La signature encodée en base64
 * @throws Error Si la signature échoue
 */
export async function signData(data: string | ArrayBuffer, privateKeyPem: string): Promise<string> {
  try {
    const privateKey = await importPrivateKeyFromPem(privateKeyPem);
    
    // Convert string to ArrayBuffer if needed
    const dataBuffer = typeof data === 'string' 
      ? new TextEncoder().encode(data) 
      : data;

    const signature = await crypto.subtle.sign(
      {
        name: 'RSASSA-PKCS1-v1_5',
      },
      privateKey,
      dataBuffer
    );

    return arrayBufferToBase64(signature);
  } catch (error) {
    console.error('Signing failed:', error);
    throw new Error('Failed to sign data: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Verify signature with public key
 * @param data Original data
 * @param signature Signature to verify (base64)
 * @param publicKeyPem Public key in PEM format
 * @returns True if signature is valid
 */
export async function verifySignature(
  data: string | ArrayBuffer,
  signature: string,
  publicKeyPem: string
): Promise<boolean> {
  try {
    const publicKey = await importPublicKeyFromPem(publicKeyPem);
    
    const dataBuffer = typeof data === 'string' 
      ? new TextEncoder().encode(data) 
      : data;
    
    const signatureBuffer = base64ToArrayBuffer(signature);

    return await crypto.subtle.verify(
      {
        name: 'RSASSA-PKCS1-v1_5',
      },
      publicKey,
      signatureBuffer,
      dataBuffer
    );
  } catch (error) {
    console.error('Verification failed:', error);
    return false;
  }
}

/**
 * Verify that a private key matches a public key
 * This is useful to ensure the private key being used matches the public key stored on the server
 * @param privateKeyPem Private key in PEM format
 * @param publicKeyPem Public key in PEM format
 * @returns True if the keys match (are a valid key pair)
 */
export async function verifyKeyPair(privateKeyPem: string, publicKeyPem: string): Promise<boolean> {
  try {
    // Create a test message
    const testMessage = 'KEY_VERIFICATION_TEST';
    
    // Sign the test message with the private key
    const signature = await signData(testMessage, privateKeyPem);
    
    // Verify the signature with the public key
    const isValid = await verifySignature(testMessage, signature, publicKeyPem);
    
    return isValid;
  } catch (error) {
    console.error('Key pair verification failed:', error);
    return false;
  }
}

/**
 * Generate ephemeral key pair for session
 * These keys are temporary and should be discarded after session ends
 */
export async function generateEphemeralKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
  publicKeyPem: string;
  privateKeyPem: string;
  sessionId: string;
}> {
  const keyPair = await generateKeyPair(2048);
  const sessionId = generateSessionId();
  
  return {
    ...keyPair,
    sessionId,
  };
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash data using SHA-256
 */
export async function hashData(data: string | ArrayBuffer): Promise<string> {
  const dataBuffer = typeof data === 'string' 
    ? new TextEncoder().encode(data) 
    : data;
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  return arrayBufferToHex(hashBuffer);
}

/**
 * Prépare les données de transaction pour le hachage (correspond au format backend)
 * 
 * Format : sender_account_number + receiver_account_number + formatted_amount
 * 
 * Le montant est formaté sur 9 chiffres (montant * 100, complété avec des zéros).
 * Cette fonction doit correspondre exactement à la fonction backend prepareTransactionData()
 * pour garantir que le hash généré côté client correspond au hash vérifié côté serveur.
 * 
 * Exemple :
 * - Montant : 100.50
 * - Formaté : 10050 (100.50 * 100)
 * - Complété : 000010050 (9 chiffres avec padding)
 * 
 * @param senderAccountNumber Numéro de compte de l'expéditeur
 * @param receiverAccountNumber Numéro de compte du destinataire
 * @param amount Montant de la transaction
 * @returns Chaîne concaténée des données de transaction
 */
export function prepareTransactionData(
  senderAccountNumber: string,
  receiverAccountNumber: string,
  amount: number
): string {
  // Formater le montant sur 9 chiffres avec padding (montant * 100, sans décimales)
  // Utiliser Math.floor() pour correspondre au comportement PHP floor()
  const formattedAmount = Math.floor(amount * 100)
    .toString()
    .padStart(9, '0');
  
  // Concaténer : expéditeur + destinataire + montant formaté
  return senderAccountNumber + receiverAccountNumber + formattedAmount;
}

/**
 * Génère le hash de transaction et le signe avec la clé privée
 * 
 * Retourne à la fois le hash et la signature.
 * 
 * ⚠️ IMPORTANT : Nous signons les données de transaction originales (pas le hash) car :
 * - openssl_verify avec OPENSSL_ALGO_SHA256 va hasher l'entrée à nouveau
 * - Donc nous devons signer les données originales, et le backend les hashera lors de la vérification
 * 
 * Processus :
 * 1. Préparer les données de transaction (format standardisé)
 * 2. Générer le hash SHA-256 (pour stockage/vérification)
 * 3. Signer les données originales avec la clé privée
 * 4. Retourner le hash (hex) et la signature (base64)
 * 
 * @param senderAccountNumber Numéro de compte de l'expéditeur
 * @param receiverAccountNumber Numéro de compte du destinataire
 * @param amount Montant de la transaction
 * @param privateKeyPem La clé privée au format PEM
 * @returns Objet contenant le hash (hex) et la signature (base64)
 */
export async function signTransaction(
  senderAccountNumber: string,
  receiverAccountNumber: string,
  amount: number,
  privateKeyPem: string
): Promise<{ hash: string; signature: string }> {
  // Prepare transaction data (matches backend format)
  const transactionData = prepareTransactionData(
    senderAccountNumber,
    receiverAccountNumber,
    amount
  );
  
  // Enhanced logging for debugging
  console.log('Signing transaction:', {
    senderAccountNumber,
    receiverAccountNumber,
    amount,
    formattedAmount: Math.floor(amount * 100).toString().padStart(9, '0'),
    transactionData,
    transactionDataLength: transactionData.length,
  });
  
  // Generate SHA-256 hash (as hex string for storage/verification)
  const hashHex = await hashData(transactionData);
  
  // Sign the ORIGINAL transaction data (not the hash)
  // openssl_verify with OPENSSL_ALGO_SHA256 will hash the input, so we sign the original data
  const signature = await signData(transactionData, privateKeyPem);
  
  console.log('Transaction signed:', {
    hash: hashHex,
    signatureLength: signature.length,
    signaturePreview: signature.substring(0, 50),
  });
  
  // Return hex hash for storage/verification, and signature
  return { hash: hashHex, signature };
}

/**
 * Convert hex string to ArrayBuffer
 */
function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

/**
 * Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Store private key securely in browser (IndexedDB or localStorage with encryption)
 * WARNING: Browser storage is not as secure as hardware tokens
 */
export async function storePrivateKeyLocally(
  userId: string,
  privateKeyPem: string,
  password?: string
): Promise<void> {
  // For now, use localStorage (in production, consider IndexedDB with encryption)
  // If password is provided, encrypt the key before storing
  let keyToStore = privateKeyPem;
  
  if (password) {
    // Encrypt with password using Web Crypto API
    keyToStore = await encryptWithPassword(privateKeyPem, password);
  }
  
  localStorage.setItem(`private_key_${userId}`, keyToStore);
}

/**
 * Retrieve private key from local storage
 */
export async function getPrivateKeyLocally(
  userId: string,
  password?: string
): Promise<string | null> {
  const stored = localStorage.getItem(`private_key_${userId}`);
  if (!stored) return null;
  
  if (password) {
    try {
      return await decryptWithPassword(stored, password);
    } catch (error) {
      console.error('Failed to decrypt private key:', error);
      return null;
    }
  }
  
  return stored;
}

/**
 * Encrypt data with password using Web Crypto API
 */
async function encryptWithPassword(data: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  // Derive key from password
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBuffer
  );
  
  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  
  return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypt data with password
 */
async function decryptWithPassword(encryptedData: string, password: string): Promise<string> {
  const decoder = new TextDecoder();
  const combined = base64ToArrayBuffer(encryptedData);
  const combinedArray = new Uint8Array(combined);
  
  const salt = combinedArray.slice(0, 16);
  const iv = combinedArray.slice(16, 28);
  const encrypted = combinedArray.slice(28);
  
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
  
  return decoder.decode(decrypted);
}

