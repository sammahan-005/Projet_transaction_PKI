<?php

namespace App\Actions\Fortify;

use App\Models\User;
use App\Models\Account;
use App\Models\PrivateKey;
use App\Services\RSAService;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    protected RSAService $rsaService;

    public function __construct(RSAService $rsaService)
    {
        $this->rsaService = $rsaService;
    }

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique(User::class),
            ],
            'phone' => ['nullable', 'string', 'max:20'],
            'date_of_birth' => ['nullable', 'date'],
            'password' => $this->passwordRules(),
            'public_key' => ['required', 'string'], // Client-generated public key
        ])->validate();

        return DB::transaction(function () use ($input) {
            // Create the user
            $user = User::create([
                'name' => $input['name'],
                'email' => $input['email'],
                'phone' => $input['phone'] ?? null,
                'date_of_birth' => $input['date_of_birth'] ?? null,
                'password' => $input['password'],
            ]);

            // SECURITY: Client-side key generation
            // The public key is generated client-side using Web Crypto API.
            // The private key NEVER leaves the client - only the public key is sent to the server.
            // This eliminates the risk of server-side key compromise.
            $publicKeyPem = $input['public_key'];

            // Validate the public key format
            if (!$this->isValidPublicKeyPem($publicKeyPem)) {
                throw new \Exception('Invalid public key format');
            }

            // Generate account number
            $accountNumber = $this->generateAccountNumber();

            // Create account with client-provided public key
            // The private key remains on the client and is never sent to the server
            $account = Account::create([
                'user_id' => $user->id,
                'account_number' => $accountNumber,
                'public_key' => $publicKeyPem, // Client-generated public key
                'balance' => 1000.00, // Initial balance
                'is_active' => true,
                'key_version' => 1,
                'key_rotated_at' => now(),
            ]);

            // NOTE: We no longer store private keys server-side.
            // The client must manage their own private key securely.
            // For backward compatibility, we create a placeholder record,
            // but it will be empty/null to indicate client-side key management.
            PrivateKey::create([
                'user_id' => $user->id,
                'account_id' => $account->id,
                'encrypted_private_key' => null, // No server-side storage
                'key_version' => 1,
            ]);

            return $user;
        });
    }

    /**
     * Generate a unique account number.
     */
    private function generateAccountNumber(): string
    {
        do {
            $accountNumber = 'PC' . str_pad(random_int(0, 999999999999999999), 18, '0', STR_PAD_LEFT);
        } while (Account::where('account_number', $accountNumber)->exists());

        return $accountNumber;
    }

    /**
     * Validate public key PEM format
     */
    private function isValidPublicKeyPem(string $publicKeyPem): bool
    {
        // Basic validation - check for PEM headers
        if (strpos($publicKeyPem, '-----BEGIN PUBLIC KEY-----') === false) {
            return false;
        }

        if (strpos($publicKeyPem, '-----END PUBLIC KEY-----') === false) {
            return false;
        }

        // Try to parse the key to ensure it's valid
        try {
            $publicKey = openssl_pkey_get_public($publicKeyPem);
            if ($publicKey === false) {
                return false;
            }
            openssl_free_key($publicKey);
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
}
