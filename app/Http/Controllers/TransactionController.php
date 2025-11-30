<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Transaction;
use App\Models\TransactionLog;
use App\Models\Certificate;
use App\Models\Notification;
use App\Services\RSAService;
use App\Services\PKIService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

/**
 * Contrôleur de gestion des transactions
 * 
 * Ce contrôleur gère toutes les opérations liées aux transactions financières sécurisées :
 * - Création de transactions avec signature PKI
 * - Vérification et traitement des transactions
 * - Récupération de l'historique des transactions
 * - Gestion des notifications
 * - Téléchargement de reçus
 * 
 * Toutes les transactions sont atomiques (ACID) pour garantir l'intégrité des données.
 * 
 * @package App\Http\Controllers
 */
class TransactionController extends Controller
{
    /** @var RSAService Service de gestion des opérations cryptographiques RSA */
    protected RSAService $rsaService;
    
    /** @var PKIService Service de gestion de l'infrastructure PKI */
    protected PKIService $pkiService;

    /**
     * Constructeur du contrôleur de transactions
     * 
     * Injection des dépendances nécessaires pour les opérations cryptographiques
     * 
     * @param RSAService $rsaService Service RSA pour la signature et vérification
     * @param PKIService $pkiService Service PKI pour la gestion des certificats
     */
    public function __construct(RSAService $rsaService, PKIService $pkiService)
    {
        $this->rsaService = $rsaService;
        $this->pkiService = $pkiService;
    }
    
    /**
     * Crée une nouvelle transaction avec signature PKI
     * 
     * Cette opération est ATOMIQUE - soit tout réussit, soit rien ne se passe.
     * Utilise une transaction de base de données pour garantir l'intégrité des données.
     * 
     * Processus :
     * 1. Validation des données d'entrée
     * 2. Vérification du PIN de transaction
     * 3. Vérification des comptes (expéditeur et destinataire)
     * 4. Vérification du solde suffisant
     * 5. Préparation des données de transaction
     * 6. Génération du hash SHA-256
     * 7. Signature (côté client ou serveur)
     * 8. Vérification de la signature
     * 9. Création de la transaction en base
     * 10. Génération du certificat PKI
     * 11. Enregistrement des logs
     * 12. Commit de la transaction atomique
     * 
     * @param Request $request Requête HTTP contenant les données de la transaction
     * @return \Illuminate\Http\RedirectResponse Redirection vers la page de succès ou retour avec erreurs
     */
    public function createTransaction(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'receiver_account_number' => 'required|string|exists:accounts,account_number',
            'amount' => 'required|numeric|min:0.01|max:999999999.99',
            'transaction_pin' => 'required|string|size:4',
            'transaction_hash' => 'nullable|string', // Client-signed transaction hash
            'digital_signature' => 'nullable|string', // Client-signed transaction signature
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        // Get authenticated user
        $user = auth()->user();
        
        // Verify transaction PIN
        if (!$user->transaction_pin) {
            return back()->withErrors(['error' => 'Transaction PIN not set. Please set your PIN in profile settings.'])->withInput();
        }
        
        if (!Hash::check($request->transaction_pin, $user->transaction_pin)) {
            return back()->withErrors(['error' => 'Invalid transaction PIN.'])->withInput();
        }

        // Get authenticated user's account
        $senderAccount = Account::where('user_id', $user->id)
            ->where('is_active', true)
            ->first();

        if (!$senderAccount) {
            return back()->withErrors(['error' => 'No active account found.'])->withInput();
        }

        // Ensure the account has a public key (generated at account creation)
        if (!$senderAccount->public_key) {
            return back()->withErrors(['error' => 'Account public key not found. Please contact support.'])->withInput();
        }

        // Get receiver account
        $receiverAccount = Account::where('account_number', $request->receiver_account_number)
            ->where('is_active', true)
            ->first();

        if (!$receiverAccount) {
            return back()->withErrors(['error' => 'Receiver account not found or inactive.'])->withInput();
        }

        // Prevent sending to self
        if ($senderAccount->id === $receiverAccount->id) {
            return back()->withErrors(['error' => 'Cannot send money to yourself.'])->withInput();
        }

        $amount = (float) $request->amount;

        // Check sufficient balance
        if (!$senderAccount->hasSufficientBalance($amount)) {
            return back()->withErrors(['error' => 'Insufficient balance.'])->withInput();
        }

        try {
            // START ATOMIC TRANSACTION
            DB::beginTransaction();

            // Step 1: Create transaction data for hashing
            $transactionData = $this->prepareTransactionData(
                $senderAccount->account_number,
                $receiverAccount->account_number,
                $amount
            );

            // Step 2: Generate SHA-256 hash
            $hash = $this->generateTransactionHash($transactionData);

            // Step 3: Determine signing method (client-side or server-side)
            $signature = null;
            
            // Check if client provided hash and signature (client-side signing)
            if ($request->has('transaction_hash') && $request->has('digital_signature')) {
                // Client-side signing: verify the provided hash matches
                if ($request->transaction_hash !== $hash) {
                    throw new \Exception('Transaction hash mismatch. The provided hash does not match the calculated hash.');
                }
                
                // Use client-provided signature (trim to remove any whitespace)
                $signature = trim($request->digital_signature);
                
                // IMMEDIATELY verify the signature before storing the transaction
                // This catches signature issues early with better error messages
                $publicKeyPem = $senderAccount->public_key;
                if (!$publicKeyPem) {
                    throw new \Exception('Public key not found for your account. Please contact support.');
                }
                
                $signatureValid = $this->rsaService->verifyWithOriginalData($transactionData, $signature, $publicKeyPem);
                
                if (!$signatureValid) {
                    Log::error('Signature verification failed during transaction creation', [
                        'user_id' => auth()->id(),
                        'account_id' => $senderAccount->id,
                        'transaction_data' => $transactionData,
                        'transaction_data_length' => strlen($transactionData),
                        'signature_length' => strlen($signature),
                        'sender_account' => $senderAccount->account_number,
                    ]);
                    
                    throw new \Exception('Signature verification failed. Your private key does not match your account. Please verify your account credentials or contact support.');
                }
                
                Log::info('Transaction signed client-side and verified successfully', [
                    'user_id' => auth()->id(),
                    'account_id' => $senderAccount->id,
                ]);
            } else {
                // Server-side signing: use stored private key (for backward compatibility)
            $privateKeyModel = $senderAccount->privateKey;
            
            if (!$privateKeyModel) {
                    throw new \Exception('Private key not found. For new accounts, please sign transactions client-side. If you have an older account, please contact support.');
            }

            if (!$privateKeyModel->encrypted_private_key) {
                    throw new \Exception('Private key data is missing. For new accounts, please sign transactions client-side. If you have an older account, please contact support.');
            }

            // Decrypt the private key using Laravel's Crypt (app key)
            $privateKeyPem = $this->rsaService->decryptPrivateKeyWithAppKey(
                $privateKeyModel->encrypted_private_key
            );

            // If decryption failed, provide helpful error message
            if (!$privateKeyPem) {
                // Check if this might be a password-encrypted key (old format)
                $encryptedKey = $privateKeyModel->encrypted_private_key;
                $mightBePasswordEncrypted = base64_decode($encryptedKey, true) !== false 
                    && strlen(base64_decode($encryptedKey, true)) > 16;
                
                Log::error('Private key decryption failed', [
                    'user_id' => auth()->id(),
                    'account_id' => $senderAccount->id,
                    'encrypted_length' => strlen($encryptedKey),
                    'might_be_password_encrypted' => $mightBePasswordEncrypted,
                ]);
                
                if ($mightBePasswordEncrypted) {
                    throw new \Exception('Your account uses an older encryption format. Please contact support to migrate your account keys, or create a new account.');
                } else {
                    throw new \Exception('Failed to decrypt your account key. This may be due to a corrupted key or encryption format mismatch. Please contact support.');
                }
            }

                // Sign the transaction hash with sender's private key (RSA)
            $signature = $this->rsaService->sign($hash, $privateKeyPem);
                
                Log::info('Transaction signed server-side', [
                    'user_id' => auth()->id(),
                    'account_id' => $senderAccount->id,
                ]);
            }

            // Step 4: Create transaction record
            $transaction = Transaction::create([
                'sender_account_id' => $senderAccount->id,
                'receiver_account_id' => $receiverAccount->id,
                'amount' => $amount,
                'transaction_hash' => $hash,
                'digital_signature' => $signature,
                'status' => 'pending',
            ]);

            // Step 5: Generate PKI certificate for this transaction
            // SECURITY: The certificate is signed by the platform CA (not the sender's private key)
            // The sender's private key is only used to sign the transaction itself, not the certificate.
            // This follows proper PKI principles: CA signs certificates, users sign transactions.
            $certificate = $this->pkiService->generateTransactionCertificate(
                $transaction,
                $senderAccount->public_key,         // Sender's public key (generated at account creation)
                $receiverAccount->public_key        // Receiver's public key (generated at account creation)
            );

            // Step 6: Log transaction creation
            TransactionLog::create([
                'transaction_id' => $transaction->id,
                'action' => 'created',
                'details' => 'Transaction created, signed, and certificate generated',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'logged_at' => now(),
            ]);

            // COMMIT ATOMIC TRANSACTION
            DB::commit();

            // Trigger verification in background (non-blocking)
            try {
                $this->verifyAndProcessTransaction($transaction->id);
            } catch (\Exception $verificationError) {
                // Log but don't fail the transaction creation
                Log::error('Transaction verification failed: ' . $verificationError->getMessage(), [
                    'transaction_id' => $transaction->id,
                ]);
            }

            // Return success response with transaction ID for receipt
            return redirect()->route('transaction.success', ['transaction_id' => $transaction->id])->with('success', 'Transaction created successfully.');

        } catch (\Exception $e) {
            // ROLLBACK on any error
            DB::rollBack();
            Log::error('Transaction creation failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => auth()->id(),
            ]);
            
            // Provide user-friendly error messages
            $errorMessage = 'Transaction failed. Please try again.';
            if (str_contains($e->getMessage(), 'decrypt')) {
                $errorMessage = 'Unable to access your account key. Please contact support.';
            } elseif (str_contains($e->getMessage(), 'balance')) {
                $errorMessage = 'Insufficient balance.';
            } elseif (str_contains($e->getMessage(), 'not found')) {
                $errorMessage = 'Account not found.';
            }
            
            return back()->withErrors(['error' => $errorMessage])->withInput();
        }
    }

    /**
     * Vérifie et traite une transaction en attente
     * 
     * Cette opération est également ATOMIQUE - soit tout réussit, soit rien ne se passe.
     * Utilise des verrous de ligne (row locks) pour garantir l'intégrité des données
     * en cas d'accès concurrent.
     * 
     * Processus :
     * 1. Verrouiller la transaction pour mise à jour
     * 2. Vérifier que la transaction est toujours en attente
     * 3. Recréer le hash depuis les données de transaction
     * 4. Vérifier que le hash correspond
     * 5. Vérifier la signature numérique avec la clé publique de l'expéditeur
     * 6. Vérifier que l'expéditeur a toujours un solde suffisant (avec verrou)
     * 7. Verrouiller le compte destinataire
     * 8. Mettre à jour les soldes de manière atomique
     * 9. Marquer la transaction comme approuvée
     * 10. Enregistrer les logs
     * 11. Créer les notifications (en dehors de la transaction)
     * 
     * @param int $transactionId L'ID de la transaction à vérifier et traiter
     * @return void
     */
    public function verifyAndProcessTransaction(int $transactionId)
    {
        try {
            // START ATOMIC TRANSACTION
            DB::beginTransaction();

            $transaction = Transaction::with(['senderAccount.user', 'receiverAccount.user'])
                ->lockForUpdate() // Lock the row for update
                ->findOrFail($transactionId);

            // Only process pending transactions
            if (!$transaction->isPending()) {
                DB::rollBack();
                return;
            }

            // Step 1: Recreate the hash from transaction data
            // Ensure amount is properly cast to float (decimal:2 cast might return string)
            $amount = (float) $transaction->amount;
            $transactionData = $this->prepareTransactionData(
                $transaction->senderAccount->account_number,
                $transaction->receiverAccount->account_number,
                $amount
            );
            $expectedHash = $this->generateTransactionHash($transactionData);

            // Step 2: Verify the hash matches
            if ($transaction->transaction_hash !== $expectedHash) {
                $this->rejectTransaction($transaction, 'Hash verification failed');
                DB::commit();
                return;
            }

            // Step 3: Verify digital signature using sender's public key
            if (!$this->verifySignature($transaction)) {
                $this->rejectTransaction($transaction, 'Signature verification failed');
                DB::commit();
                return;
            }

            // Step 4: Check sender still has sufficient balance (with row lock)
            $senderAccount = Account::lockForUpdate()->find($transaction->sender_account_id);
            if (!$senderAccount->hasSufficientBalance($transaction->amount)) {
                $this->rejectTransaction($transaction, 'Insufficient balance');
                DB::commit();
                return;
            }

            // Step 5: Lock receiver account
            $receiverAccount = Account::lockForUpdate()->find($transaction->receiver_account_id);

            // Step 6: Update balances ATOMICALLY
            $senderAccount->balance -= $transaction->amount;
            $senderAccount->save();

            $receiverAccount->balance += $transaction->amount;
            $receiverAccount->save();

            // Step 7: Mark transaction as approved
            $transaction->markAsApproved();

            // Step 8: Log the approval
            TransactionLog::create([
                'transaction_id' => $transaction->id,
                'action' => 'approved',
                'details' => 'Transaction verified and approved. Balances updated.',
                'logged_at' => now(),
            ]);

            // COMMIT ATOMIC TRANSACTION
            DB::commit();

            // Step 9: Create notifications for both sender and receiver (outside transaction)
            $senderUser = $transaction->senderAccount->user;
            $receiverUser = $transaction->receiverAccount->user;

            // Notification for receiver (money received)
            Notification::create([
                'user_id' => $receiverUser->id,
                'type' => 'money_received',
                'title' => 'Argent reçu',
                'message' => "Vous avez reçu " . number_format($transaction->amount, 2, ',', ' ') . " ₱ de {$senderUser->name}",
                'transaction_id' => $transaction->id,
                'is_read' => false,
            ]);

            // Notification for sender (money sent)
            Notification::create([
                'user_id' => $senderUser->id,
                'type' => 'money_sent',
                'title' => 'Argent envoyé',
                'message' => "Vous avez envoyé " . number_format($transaction->amount, 2, ',', ' ') . " ₱ à {$receiverUser->name}",
                'transaction_id' => $transaction->id,
                'is_read' => false,
            ]);

            Log::info("Transaction #{$transactionId} approved successfully");

        } catch (\Exception $e) {
            // ROLLBACK on any error
            DB::rollBack();
            Log::error("Transaction verification failed for #{$transactionId}: " . $e->getMessage());

            // Try to mark as failed (in separate transaction)
            try {
                DB::beginTransaction();
                $trans = Transaction::find($transactionId);
                if ($trans && $trans->isPending()) {
                    $trans->markAsFailed($e->getMessage());
                }
                DB::commit();
            } catch (\Exception $ex) {
                DB::rollBack();
            }
        }
    }

    /**
     * Prépare les données de transaction pour le hachage
     * 
     * ⚠️ IMPORTANT : Cette fonction doit correspondre exactement à la fonction
     * frontend prepareTransactionData() pour garantir que le hash généré côté client
     * correspond au hash vérifié côté serveur.
     * 
     * Format : sender_account_number + receiver_account_number + formatted_amount
     * 
     * Le montant est formaté sur 9 chiffres (montant * 100, sans décimales, arrondi vers le bas).
     * Utiliser floor() pour correspondre au comportement JavaScript Math.floor().
     * 
     * Frontend équivalent : Math.floor(amount * 100).toString().padStart(9, '0')
     * 
     * @param string $senderAccountNumber Numéro de compte de l'expéditeur
     * @param string $receiverAccountNumber Numéro de compte du destinataire
     * @param float $amount Montant de la transaction
     * @return string Chaîne concaténée des données de transaction
     */
    private function prepareTransactionData(string $senderAccountNumber, string $receiverAccountNumber, float $amount): string
    {
        // Nettoyer les numéros de compte pour supprimer tout espace blanc
        $senderAccountNumber = trim($senderAccountNumber);
        $receiverAccountNumber = trim($receiverAccountNumber);
        
        // Formater le montant sur 9 chiffres avec padding (montant * 100, sans décimales, arrondi vers le bas)
        // Utiliser floor() pour correspondre au comportement JavaScript Math.floor()
        // Frontend : Math.floor(amount * 100).toString().padStart(9, '0')
        $formattedAmount = str_pad((string) floor($amount * 100), 9, '0', STR_PAD_LEFT);

        // Concaténer : numéro de compte expéditeur + numéro de compte destinataire + montant formaté
        // Les numéros de compte peuvent avoir n'importe quelle longueur (ex: "PC" + 18 chiffres), pas nécessairement 9 chiffres
        return $senderAccountNumber . $receiverAccountNumber . $formattedAmount;
    }

    /**
     * Génère le hash SHA-256 des données de transaction
     * 
     * Le hash est utilisé pour vérifier l'intégrité des données de transaction
     * et correspond au hash généré côté client.
     * 
     * @param string $data Les données de transaction à hasher
     * @return string Le hash SHA-256 en hexadécimal
     */
    private function generateTransactionHash(string $data): string
    {
        return hash('sha256', $data);
    }

    /**
     * Verify digital signature using sender's public key and certificate
     */
    private function verifySignature(Transaction $transaction): bool
    {
        try {
            // Get sender's public key (PEM format)
            $publicKeyPem = $transaction->senderAccount->public_key;

            if (!$publicKeyPem) {
                Log::error("Transaction #{$transaction->id}: Public key is missing for sender account");
                return false;
            }

            // Get signature and hash
            // Trim signature to remove any whitespace that might have been added during storage
            $signature = trim($transaction->digital_signature);
            $hash = $transaction->transaction_hash;

            if (!$signature) {
                Log::error("Transaction #{$transaction->id}: Digital signature is missing");
                return false;
            }

            // Recreate the original transaction data to verify signature
            // Frontend signs the original data, not the hash
            // Ensure amount is properly cast to float (decimal:2 cast might return string)
            $amount = (float) $transaction->amount;
            $transactionData = $this->prepareTransactionData(
                $transaction->senderAccount->account_number,
                $transaction->receiverAccount->account_number,
                $amount
            );

            // Enhanced logging for debugging
            Log::info("Transaction #{$transaction->id}: Verifying signature", [
                'sender_account' => $transaction->senderAccount->account_number,
                'receiver_account' => $transaction->receiverAccount->account_number,
                'amount' => $transaction->amount,
                'amount_type' => gettype($transaction->amount),
                'transaction_data' => $transactionData,
                'transaction_data_length' => strlen($transactionData),
                'transaction_data_hex' => bin2hex($transactionData),
                'signature_length' => strlen($signature),
                'signature_preview' => substr($signature, 0, 50),
                'hash' => $hash,
                'calculated_hash' => $this->generateTransactionHash($transactionData),
            ]);

            // Verify RSA signature using original transaction data
            // openssl_verify with OPENSSL_ALGO_SHA256 will hash the data and verify
            $signatureValid = $this->rsaService->verifyWithOriginalData($transactionData, $signature, $publicKeyPem);

            if (!$signatureValid) {
                Log::warning("Transaction #{$transaction->id}: RSA signature verification failed", [
                    'sender_account' => $transaction->senderAccount->account_number,
                    'receiver_account' => $transaction->receiverAccount->account_number,
                    'amount' => $transaction->amount,
                    'transaction_data' => $transactionData,
                    'transaction_data_hex' => bin2hex($transactionData),
                ]);
                return false;
            }

            // Verify certificate if exists (using CA public key, not user's public key)
            // Note: Certificate verification failure should not block transaction approval
            // The transaction signature is the critical security check
            $certificate = Certificate::where('transaction_id', $transaction->id)->first();
            if ($certificate) {
                try {
                    $certificateValid = $this->pkiService->verifyCertificate($certificate);
                    if (!$certificateValid) {
                        Log::warning("Transaction #{$transaction->id}: Certificate verification failed, but transaction signature is valid", [
                            'transaction_id' => $transaction->id,
                        ]);
                        // Continue - certificate verification is informational, not required
                    } else {
                        Log::info("Transaction #{$transaction->id}: Certificate verified successfully");
                    }
                } catch (\Exception $certError) {
                    Log::warning("Transaction #{$transaction->id}: Certificate verification error (non-blocking): " . $certError->getMessage());
                    // Continue - certificate verification errors don't block valid transactions
                }
            }

            return true;

        } catch (\Exception $e) {
            Log::error('Signature verification error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Reject a transaction with reason
     */
    private function rejectTransaction(Transaction $transaction, string $reason): void
    {
        $transaction->markAsRejected($reason);

        TransactionLog::create([
            'transaction_id' => $transaction->id,
            'action' => 'rejected',
            'details' => $reason,
            'logged_at' => now(),
        ]);

        Log::warning("Transaction #{$transaction->id} rejected: {$reason}");
    }

    /**
     * Get transaction history for authenticated user (for Home/Dashboard - limited)
     */
    public function getTransactions(Request $request)
    {
        $user = auth()->user();
        $account = Account::where('user_id', $user->id)->first();

        if (!$account) {
            return Inertia::render('Home', [
                'transactions' => [],
                'account' => null,
                'balance' => 0,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'profile_picture' => $user->profile_picture ?? null,
                ],
            ]);
        }

        $transactions = Transaction::where('sender_account_id', $account->id)
            ->orWhere('receiver_account_id', $account->id)
            ->with(['senderAccount.user', 'receiverAccount.user'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($transaction) use ($account) {
                $isReceive = $transaction->receiver_account_id === $account->id;
                return [
                    'id' => $transaction->id,
                    'type' => $isReceive ? 'receive' : 'send',
                    'amount' => (float) $transaction->amount,
                    'date' => $transaction->created_at->toISOString(),
                    'sender' => $isReceive ? $transaction->senderAccount->user->name : null,
                    'recipient' => !$isReceive ? $transaction->receiverAccount->user->name : null,
                    'avatarUrl' => null,
                ];
            });

        return Inertia::render('Home', [
            'transactions' => $transactions,
            'account' => $account ? [
                'account_number' => $account->account_number,
            ] : null,
            'balance' => (float) $account->balance,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'profile_picture' => $user->profile_picture ?? null,
            ],
        ]);
    }

    /**
     * Get full transaction history with balance calculations (for History page)
     */
    public function getTransactionHistory(Request $request)
    {
        $user = auth()->user();
        $account = Account::where('user_id', $user->id)->first();

        if (!$account) {
            return Inertia::render('History', [
                'transactions' => [],
                'account' => null,
                'current_balance' => 0,
                'total_received' => 0,
                'total_sent' => 0,
            ]);
        }

        // Get all transactions for this account (sent and received)
        $allTransactions = Transaction::where(function ($query) use ($account) {
            $query->where('sender_account_id', $account->id)
                  ->orWhere('receiver_account_id', $account->id);
        })
        ->where('status', 'approved') // Only show approved transactions
        ->with(['senderAccount.user', 'receiverAccount.user'])
        ->orderBy('created_at', 'desc')
        ->get();

        // Calculate totals for this month
        $startOfMonth = now()->startOfMonth();
        $monthlyTransactions = $allTransactions->filter(function ($transaction) use ($startOfMonth) {
            return $transaction->created_at >= $startOfMonth;
        });

        $totalReceived = $monthlyTransactions
            ->where('receiver_account_id', $account->id)
            ->sum('amount');

        $totalSent = $monthlyTransactions
            ->where('sender_account_id', $account->id)
            ->sum('amount');

        // Map transactions for frontend
        $transactions = $allTransactions->map(function ($transaction) use ($account, $user) {
            $isReceive = $transaction->receiver_account_id === $account->id;
            $otherUser = $isReceive ? $transaction->senderAccount->user : $transaction->receiverAccount->user;
            
            return [
                'id' => (string) $transaction->id,
                'type' => $isReceive ? 'receive' : 'send',
                'amount' => (float) $transaction->amount,
                'date' => $transaction->created_at->toISOString(),
                'sender' => $isReceive ? $otherUser->name : null,
                'recipient' => !$isReceive ? $otherUser->name : null,
                'sender_email' => $isReceive ? $otherUser->email : null,
                'recipient_email' => !$isReceive ? $otherUser->email : null,
                'sender_profile_picture' => $isReceive ? ($otherUser->profile_picture ?? null) : null,
                'recipient_profile_picture' => !$isReceive ? ($otherUser->profile_picture ?? null) : null,
                'status' => $transaction->status,
            ];
        });

        return Inertia::render('History', [
            'transactions' => $transactions,
            'account' => [
                'id' => $account->id,
                'account_number' => $account->account_number,
                'balance' => (float) $account->balance,
            ],
            'current_balance' => (float) $account->balance,
            'total_received' => (float) $totalReceived,
            'total_sent' => (float) $totalSent,
        ]);
    }

    /**
     * Get list of beneficiaries (other users with active accounts)
     */
    public function getBeneficiaries(Request $request)
    {
        $currentUser = auth()->user();
        $currentAccount = Account::where('user_id', $currentUser->id)->first();

        // Get all users except the current user, who have active accounts
        $beneficiaries = Account::where('user_id', '!=', $currentUser->id)
            ->where('is_active', true)
            ->with('user')
            ->get()
            ->map(function ($account) {
                return [
                    'id' => (string) $account->id,
                    'name' => $account->user->name,
                    'username' => $account->account_number,
                    'account_number' => $account->account_number,
                    'avatarUrl' => $account->user->profile_picture ?? null,
                    'email' => $account->user->email,
                ];
            });

        return response()->json([
            'beneficiaries' => $beneficiaries,
        ]);
    }

    /**
     * Get notifications for authenticated user
     */
    public function getNotifications(Request $request)
    {
        $user = auth()->user();

        $notifications = \App\Models\Notification::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($notification) {
                return [
                    'id' => $notification->id,
                    'type' => $notification->type,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'is_read' => $notification->is_read,
                    'created_at' => $notification->created_at->toISOString(),
                    'transaction_id' => $notification->transaction_id,
                ];
            });

        $unreadCount = \App\Models\Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        return Inertia::render('Notifications', [
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Mark notification as read
     */
    public function markNotificationAsRead(Request $request, $id)
    {
        $user = auth()->user();
        
        $notification = \App\Models\Notification::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $notification->markAsRead();

        return response()->json(['success' => true]);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllNotificationsAsRead(Request $request)
    {
        $user = auth()->user();
        
        \App\Models\Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json(['success' => true]);
    }

    /**
     * Show transaction success page
     */
    public function transactionSuccess(Request $request, $transaction_id)
    {
        $user = auth()->user();
        $transaction = Transaction::with(['senderAccount.user', 'receiverAccount.user'])
            ->where('id', $transaction_id)
            ->where(function ($query) use ($user) {
                $query->whereHas('senderAccount', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                })->orWhereHas('receiverAccount', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                });
            })
            ->firstOrFail();

        $isSender = $transaction->senderAccount->user_id === $user->id;
        $otherUser = $isSender ? $transaction->receiverAccount->user : $transaction->senderAccount->user;

        return Inertia::render('TransactionSuccess', [
            'transaction' => [
                'id' => $transaction->id,
                'amount' => (float) $transaction->amount,
                'status' => $transaction->status,
                'rejection_reason' => $transaction->rejection_reason,
                'created_at' => $transaction->created_at->toISOString(),
                'other_user' => [
                    'name' => $otherUser->name,
                    'account_number' => $isSender ? $transaction->receiverAccount->account_number : $transaction->senderAccount->account_number,
                ],
                'type' => $isSender ? 'sent' : 'received',
            ],
        ]);
    }

    /**
     * Get transaction status (API endpoint for polling)
     */
    public function getTransactionStatus(Request $request, $transaction_id)
    {
        $user = auth()->user();
        $transaction = Transaction::where('id', $transaction_id)
            ->where(function ($query) use ($user) {
                $query->whereHas('senderAccount', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                })->orWhereHas('receiverAccount', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                });
            })
            ->firstOrFail();

        return response()->json([
            'status' => $transaction->status,
            'rejection_reason' => $transaction->rejection_reason,
        ]);
    }

    /**
     * Download transaction receipt as PDF
     */
    public function downloadReceipt(Request $request, $transaction_id)
    {
        $user = auth()->user();
        $transaction = Transaction::with(['senderAccount.user', 'receiverAccount.user'])
            ->where('id', $transaction_id)
            ->where(function ($query) use ($user) {
                $query->whereHas('senderAccount', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                })->orWhereHas('receiverAccount', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                });
            })
            ->firstOrFail();

        $isSender = $transaction->senderAccount->user_id === $user->id;
        
        // Refresh accounts to get latest balances
        $transaction->senderAccount->refresh();
        $transaction->receiverAccount->refresh();
        
        // Generate HTML receipt
        $html = view('receipt.transaction', [
            'transaction' => $transaction,
            'user' => $user,
            'isSender' => $isSender,
        ])->render();

        // For now, return HTML (we can add PDF generation later with dompdf or similar)
        return response($html, 200)
            ->header('Content-Type', 'text/html')
            ->header('Content-Disposition', 'inline; filename="receipt_' . $transaction_id . '.html"');
    }

    /**
     * Get a beneficiary by account number or ID
     */
    public function getBeneficiaryByAccountNumber(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'account_number' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Account number is required',
            ], 400);
        }

        $currentUser = auth()->user();
        $accountNumber = $request->input('account_number');

        // Find account by account number
        $account = Account::where('account_number', $accountNumber)
            ->where('is_active', true)
            ->with('user')
            ->first();

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'Account not found',
            ], 404);
        }

        // Prevent selecting own account
        if ($account->user_id === $currentUser->id) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot send money to yourself',
            ], 400);
        }

        $beneficiary = [
            'id' => (string) $account->id,
            'name' => $account->user->name,
            'username' => $account->account_number,
            'account_number' => $account->account_number,
            'avatarUrl' => $account->user->profile_picture ?? null,
            'email' => $account->user->email,
        ];

        return response()->json([
            'success' => true,
            'beneficiary' => $beneficiary,
        ]);
    }

    /**
     * Get PKI workflow data for all transactions (Admin only)
     * Shows public keys, private keys, certificates, and entities (Sender, CA, Receiver)
     */
    public function getPKIWorkflow(Request $request)
    {
        // Get ALL transactions (admin view)
        $transactions = Transaction::query()
        ->with([
            'senderAccount.user',
            'receiverAccount.user',
            'senderAccount.privateKey',
            'receiverAccount.privateKey',
        ])
        ->with('certificate')
        ->orderBy('created_at', 'desc')
        ->get();

        $user = auth()->user(); // May be null if not authenticated
        
            $workflowData = $transactions->map(function ($transaction) use ($request) {
            $senderAccount = $transaction->senderAccount;
            $receiverAccount = $transaction->receiverAccount;
            
            // Get sender's private key (decrypted for display)
            $senderPrivateKeyPem = null;
            if ($senderAccount->privateKey && $senderAccount->privateKey->encrypted_private_key) {
                try {
                    $senderPrivateKeyPem = $this->rsaService->decryptPrivateKeyWithAppKey(
                        $senderAccount->privateKey->encrypted_private_key
                    );
                } catch (\Exception $e) {
                    Log::warning('Failed to decrypt sender private key for PKI workflow', [
                        'transaction_id' => $transaction->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Get certificate
            $certificate = Certificate::where('transaction_id', $transaction->id)->first();
            
            // Parse certificate data if exists
            $certificateDetails = null;
            if ($certificate) {
                try {
                    // Extract certificate data from PEM format
                    preg_match('/-----BEGIN CERTIFICATE-----(.*?)-----END CERTIFICATE-----/s', 
                        $certificate->certificate_data, $matches);
                    if (isset($matches[1])) {
                        $certDataJson = base64_decode(trim($matches[1]));
                        $certData = json_decode($certDataJson, true);
                        $certificateDetails = $certData;
                    }
                } catch (\Exception $e) {
                    Log::warning('Failed to parse certificate data', [
                        'transaction_id' => $transaction->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            return [
                'transaction' => [
                    'id' => $transaction->id,
                    'amount' => (float) $transaction->amount,
                    'status' => $transaction->status,
                    'transaction_hash' => $transaction->transaction_hash,
                    'digital_signature' => $transaction->digital_signature,
                    'created_at' => $transaction->created_at->toISOString(),
                ],
                'sender' => [
                    'entity' => 'Expéditeur',
                    'name' => $senderAccount->user->name,
                    'email' => $senderAccount->user->email,
                    'account_number' => $senderAccount->account_number,
                    'public_key' => $senderAccount->public_key,
                    'private_key' => $senderPrivateKeyPem, // Decrypted for display
                ],
                'ca' => $this->getThirdPartyCAWorkflowData(),
                'receiver' => [
                    'entity' => 'Destinataire',
                    'name' => $receiverAccount->user->name,
                    'email' => $receiverAccount->user->email,
                    'account_number' => $receiverAccount->account_number,
                    'public_key' => $receiverAccount->public_key,
                ],
                'certificate' => $certificate ? [
                    'id' => $certificate->id,
                    'serial_number' => $certificate->serial_number,
                    'issuer' => $certificate->issuer,
                    'subject' => $certificate->subject,
                    'signature' => $certificate->signature,
                    'issued_at' => $certificate->issued_at->toISOString(),
                    'expires_at' => $certificate->expires_at->toISOString(),
                    'certificate_data' => $certificate->certificate_data,
                    'parsed_data' => $certificateDetails,
                ] : null,
            ];
        });

        return Inertia::render('PKIWorkflow', [
            'transactions' => $workflowData,
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ] : null,
            'isAdmin' => true, // Flag to indicate this is admin view
        ]);
    }

    /**
     * Get third-party CA workflow data for display
     */
    private function getThirdPartyCAWorkflowData(): array
    {
        try {
            $caInfo = $this->pkiService->getCAService()->getCAInfo();
            $ca = $this->pkiService->getCAService()->getCAEntity();
            
            return [
                'entity' => 'Autorité de Certification (AC) - Tiers de Confiance',
                'name' => $caInfo['name'],
                'organization' => $caInfo['organization'],
                'distinguished_name' => $caInfo['distinguished_name'],
                'email' => $caInfo['email'] ?? 'ca@pipocoin.platform',
                'account_number' => 'PLATFORM-CA',
                'public_key' => $caInfo['public_key'],
                'public_key_fingerprint' => $caInfo['public_key_fingerprint'],
                'key_size' => $caInfo['key_size'],
                'established_at' => $caInfo['established_at'],
                'ca_id' => $caInfo['id'],
                'note' => 'La plateforme agit en tant qu\'Autorité de Certification (AC) tierce partie indépendante. L\'AC émet et signe les certificats pour les transactions avec sa propre clé privée. Les utilisateurs signent les transactions avec leurs propres clés. L\'AC et les utilisateurs sont des entités distinctes.',
                'role' => 'Third-Party Certificate Authority',
                'responsibilities' => [
                    'Vérifier les détails des transactions',
                    'Émettre des certificats pour les transactions valides',
                    'Signer les certificats avec la clé privée de l\'AC',
                    'Maintenir la confiance dans le système PKI',
                ],
            ];
        } catch (\Exception $e) {
            Log::warning('Failed to get third-party CA info for PKI workflow: ' . $e->getMessage());
            return [
                'entity' => 'Autorité de Certification (AC) - Tiers de Confiance',
                'name' => 'Plateforme Pipocoin',
                'email' => 'ca@pipocoin.platform',
                'account_number' => 'PLATFORM-CA',
                'public_key' => 'CA non initialisée - Exécutez: php artisan ca:initialize',
                'note' => 'L\'AC tierce partie n\'est pas encore initialisée. Exécutez la commande "php artisan ca:initialize" pour initialiser l\'Autorité de Certification.',
            ];
        }
    }
}
