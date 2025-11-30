<?php

namespace App\Console\Commands;

use App\Services\KeyRotationService;
use Illuminate\Console\Command;

class RotateKeys extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'keys:rotate 
                            {--type=all : Type of keys to rotate (user, ca, all)}
                            {--account-id= : Specific account ID to rotate (for user keys)}
                            {--force : Force rotation even if not due}
                            {--cleanup : Clean up deprecated keys after rotation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Rotate user or CA keys according to rotation policies';

    protected KeyRotationService $rotationService;

    public function __construct(KeyRotationService $rotationService)
    {
        parent::__construct();
        $this->rotationService = $rotationService;
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $type = $this->option('type');
        $force = $this->option('force');
        $cleanup = $this->option('cleanup');

        $this->info('Starting key rotation...');
        $this->newLine();

        // Display rotation policy
        $policy = $this->rotationService->getRotationPolicy();
        $this->info('Rotation Policy:');
        $this->line('  User keys max age: ' . $policy['user_key_max_age_days'] . ' days');
        $this->line('  CA keys max age: ' . $policy['ca_key_max_age_days'] . ' days');
        $this->line('  Grace period: ' . $policy['grace_period_days'] . ' days');
        $this->newLine();

        $success = true;

        if ($type === 'all' || $type === 'user') {
            $success = $this->rotateUserKeys($force) && $success;
        }

        if ($type === 'all' || $type === 'ca') {
            $success = $this->rotateCAKey($force) && $success;
        }

        if ($cleanup) {
            $this->info('Cleaning up deprecated keys...');
            $deleted = $this->rotationService->cleanupDeprecatedKeys();
            $this->info("Cleaned up {$deleted} deprecated keys.");
        }

        return $success ? Command::SUCCESS : Command::FAILURE;
    }

    protected function rotateUserKeys(bool $force): bool
    {
        $this->info('Rotating user keys...');

        $accountId = $this->option('account-id');
        
        if ($accountId) {
            // Rotate specific account
            $account = \App\Models\Account::find($accountId);
            if (!$account) {
                $this->error("Account {$accountId} not found.");
                return false;
            }

            if ($this->rotationService->rotateUserKey($account, $force)) {
                $this->info("✓ Key rotated for account {$accountId}");
                return true;
            } else {
                $this->warn("Key rotation not needed or failed for account {$accountId}");
                return false;
            }
        } else {
            // Rotate all accounts that need it
            $results = $this->rotationService->rotateAllExpiredKeys();
            
            $this->info("Rotated {$results['success']} keys successfully.");
            if ($results['failed'] > 0) {
                $this->warn("Failed to rotate {$results['failed']} keys.");
                foreach ($results['errors'] as $error) {
                    $this->error("  - {$error}");
                }
            }
            
            return $results['failed'] === 0;
        }
    }

    protected function rotateCAKey(bool $force): bool
    {
        $this->info('Rotating CA key...');
        
        if ($this->rotationService->rotateCAKey($force)) {
            $this->info('✓ CA key rotated successfully');
            return true;
        } else {
            $this->warn('CA key rotation not needed or failed');
            return false;
        }
    }
}

