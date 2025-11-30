<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\User;
use App\Models\Account;
use App\Models\Certificate;
use App\Http\Controllers\TransactionController;
use App\Services\RSAService;
use App\Services\PKIService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    protected TransactionController $transactionController;
    protected RSAService $rsaService;
    protected PKIService $pkiService;

    public function __construct(
        TransactionController $transactionController,
        RSAService $rsaService,
        PKIService $pkiService
    ) {
        $this->transactionController = $transactionController;
        $this->rsaService = $rsaService;
        $this->pkiService = $pkiService;
    }

    /**
     * Show admin dashboard
     */
    public function dashboard(Request $request)
    {
        $stats = [
            'total_transactions' => Transaction::count(),
            'total_users' => User::count(),
            'total_accounts' => Account::count(),
            'total_certificates' => Certificate::count(),
        ];

        return Inertia::render('Admin/Dashboard', [
            'stats' => $stats,
        ]);
    }

    /**
     * Get PKI workflow data for all transactions (Admin only)
     */
    public function getPKIWorkflow(Request $request)
    {
        return $this->transactionController->getPKIWorkflow($request);
    }

    /**
     * Show disputes management page
     */
    public function disputes(Request $request)
    {
        return Inertia::render('Admin/Disputes');
    }

    /**
     * Show dispute detail page with PKI verification evidence
     */
    public function disputeDetail(Request $request, string $disputeType)
    {
        // Get a real transaction for demonstration (or use demo data)
        $transaction = Transaction::with(['senderAccount.user', 'receiverAccount.user', 'certificate'])
            ->where('status', '!=', 'pending')
            ->orderBy('created_at', 'desc')
            ->first();

        $transactionData = null;
        $verification = null;

        $transactionForView = null;

        if ($transaction) {
            // Prepare transaction data for verification
            $transactionData = $this->prepareTransactionData(
                $transaction->senderAccount->account_number,
                $transaction->receiverAccount->account_number,
                (float) $transaction->amount
            );

            // Perform verification
            $hashVerified = $this->verifyHash($transaction, $transactionData);
            $signatureVerified = $this->verifySignature($transaction, $transactionData);
            $certificateVerified = $this->verifyCertificate($transaction);

            $verification = [
                'hash_verified' => $hashVerified,
                'signature_verified' => $signatureVerified,
                'certificate_verified' => $certificateVerified,
                'transaction_data_integrity' => $hashVerified && $signatureVerified,
                'conclusion' => $this->getConclusion($disputeType, $transaction, $hashVerified, $signatureVerified),
                'transaction_data' => $transactionData,
            ];

            $transactionForView = [
                'id' => $transaction->id,
                'amount' => (float) $transaction->amount,
                'status' => $transaction->status,
                'transaction_hash' => $transaction->transaction_hash,
                'digital_signature' => $transaction->digital_signature,
                'created_at' => $transaction->created_at->toISOString(),
                'sender' => [
                    'name' => $transaction->senderAccount->user->name,
                    'email' => $transaction->senderAccount->user->email,
                    'account_number' => $transaction->senderAccount->account_number,
                    'public_key' => $transaction->senderAccount->public_key,
                ],
                'receiver' => [
                    'name' => $transaction->receiverAccount->user->name,
                    'account_number' => $transaction->receiverAccount->account_number,
                ],
            ];
        }

        return Inertia::render('Admin/DisputeDetail', [
            'disputeType' => $disputeType,
            'transaction' => $transactionForView,
            'verification' => $verification,
        ]);
    }

    /**
     * Prepare transaction data string (same format as TransactionController)
     */
    private function prepareTransactionData(string $senderAccountNumber, string $receiverAccountNumber, float $amount): string
    {
        $senderAccountNumber = trim($senderAccountNumber);
        $receiverAccountNumber = trim($receiverAccountNumber);
        $formattedAmount = str_pad((string) floor($amount * 100), 9, '0', STR_PAD_LEFT);
        return $senderAccountNumber . $receiverAccountNumber . $formattedAmount;
    }

    /**
     * Verify transaction hash
     */
    private function verifyHash(Transaction $transaction, string $transactionData): bool
    {
        $calculatedHash = hash('sha256', $transactionData);
        return $calculatedHash === $transaction->transaction_hash;
    }

    /**
     * Verify transaction signature
     */
    private function verifySignature(Transaction $transaction, string $transactionData): bool
    {
        try {
            $publicKeyPem = $transaction->senderAccount->public_key;
            if (!$publicKeyPem) {
                return false;
            }

            $signature = trim($transaction->digital_signature);
            return $this->rsaService->verifyWithOriginalData($transactionData, $signature, $publicKeyPem);
        } catch (\Exception $e) {
            Log::error('Signature verification failed in dispute detail: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Verify certificate
     */
    private function verifyCertificate(Transaction $transaction): bool
    {
        $certificate = $transaction->certificate;
        if (!$certificate) {
            return false;
        }

        try {
            return $this->pkiService->verifyCertificate($certificate);
        } catch (\Exception $e) {
            Log::error('Certificate verification failed in dispute detail: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get conclusion based on dispute type
     */
    private function getConclusion(string $disputeType, Transaction $transaction, bool $hashVerified, bool $signatureVerified): string
    {
        $isValid = $hashVerified && $signatureVerified;

        switch ($disputeType) {
            case 'transaction_denial':
                return $isValid
                    ? 'La transaction est authentique et intègre. La signature numérique vérifiée prouve que l\'utilisateur a bien effectué cette transaction avec sa clé privée unique.'
                    : 'La transaction présente des anomalies. La vérification cryptographique a échoué.';
            
            case 'transaction_modification':
                return $isValid
                    ? 'L\'intégrité des données est garantie. Le hash SHA-256 vérifie que les détails de la transaction (montant, comptes) n\'ont pas été modifiés après signature.'
                    : 'Les données de transaction ont été modifiées. Le hash calculé ne correspond pas au hash enregistré.';
            
            case 'account_compromise':
                return $isValid
                    ? 'La clé privée utilisée correspond à la clé publique enregistrée. La vérification de signature prouve que seule la clé privée légitime a pu créer cette signature.'
                    : 'La signature ne peut pas être vérifiée. Possible compromission du compte ou utilisation d\'une clé non autorisée.';
            
            case 'transaction_rejection':
                return !$isValid
                    ? 'La transaction a été correctement rejetée. La vérification cryptographique a identifié des incohérences (signature invalide ou hash incorrect).'
                    : 'La transaction est valide. Le rejet pourrait être dû à d\'autres raisons (solde insuffisant, etc.).';
            
            default:
                return 'Analyse PKI en cours...';
        }
    }

    /**
     * Show users management page
     */
    public function users(Request $request)
    {
        $users = User::with('account')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'account' => $user->account ? [
                        'id' => $user->account->id,
                        'account_number' => $user->account->account_number,
                        'balance' => (float) $user->account->balance,
                        'is_active' => $user->account->is_active,
                    ] : null,
                    'created_at' => $user->created_at->toISOString(),
                ];
            });

        return Inertia::render('Admin/Users', [
            'users' => $users,
        ]);
    }

    /**
     * Increase user balance
     */
    public function increaseBalance(Request $request, User $user)
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01|max:1000000',
            'reason' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $account = $user->account;
        if (!$account) {
            return back()->withErrors(['error' => 'L\'utilisateur n\'a pas de compte associé.'])->withInput();
        }

        try {
            DB::beginTransaction();

            $oldBalance = $account->balance;
            $amount = (float) $request->amount;
            $newBalance = $oldBalance + $amount;

            $account->balance = $newBalance;
            $account->save();

            // Log the balance increase
            Log::info('Admin balance increase', [
                'admin_id' => auth()->id(),
                'user_id' => $user->id,
                'user_email' => $user->email,
                'amount' => $amount,
                'old_balance' => $oldBalance,
                'new_balance' => $newBalance,
                'reason' => $request->reason ?? 'No reason provided',
            ]);

            DB::commit();

            return back()->with('success', "Le solde de {$user->name} a été augmenté de {$amount} FCFA. Nouveau solde: {$newBalance} FCFA.");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to increase user balance', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return back()->withErrors(['error' => 'Une erreur est survenue lors de l\'augmentation du solde.'])->withInput();
        }
    }
}

