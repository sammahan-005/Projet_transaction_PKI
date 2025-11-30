<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\Account;
use App\Services\RSAService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RegenerateUserKeys extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'keys:regenerate 
                            {--user-id= : Specific user ID to regenerate keys for}
                            {--all : Regenerate keys for all users}
                            {--force : Force regeneration without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Regenerate RSA key pairs for users (migrates from password-encrypted to Laravel Crypt format)';

    protected RSAService $rsaService;

    public function __construct(RSAService $rsaService)
    {
        parent::__construct();
        $this->rsaService = $rsaService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        if ($this->option('all')) {
            $users = User::whereHas('account')->get();
            $this->info("Found {$users->count()} users with accounts.");
            
            if (!$this->option('force') && !$this->confirm('This will regenerate keys for ALL users. Continue?')) {
                $this->info('Cancelled.');
                return 0;
            }
        } elseif ($this->option('user-id')) {
            $users = collect([User::findOrFail($this->option('user-id'))]);
        } else {
            $this->error('Please specify --user-id=X or --all');
            return 1;
        }

        $success = 0;
        $failed = 0;

        foreach ($users as $user) {
            try {
                $this->regenerateKeysForUser($user);
                $success++;
                $this->info("✓ Regenerated keys for user: {$user->email} (ID: {$user->id})");
            } catch (\Exception $e) {
                $failed++;
                $this->error("✗ Failed for user {$user->email}: " . $e->getMessage());
            }
        }

        $this->info("\nComplete! Success: {$success}, Failed: {$failed}");
        return 0;
    }

    protected function regenerateKeysForUser(User $user): void
    {
        DB::transaction(function () use ($user) {
            $account = $user->account;
            
            if (!$account) {
                throw new \Exception('User has no account');
            }

            // Generate new RSA key pair
            $keyPair = $this->rsaService->generateKeyPair();

            // Update account with new public key
            $account->public_key = $keyPair['public_key'];
            $account->save();

            // Encrypt and update private key using Laravel Crypt
            $encryptedPrivateKey = $this->rsaService->encryptPrivateKeyWithAppKey(
                $keyPair['private_key']
            );

            $privateKey = $account->privateKey;
            if (!$privateKey) {
                throw new \Exception('Private key record not found');
            }

            $privateKey->encrypted_private_key = $encryptedPrivateKey;
            $privateKey->save();
        });
    }
}

