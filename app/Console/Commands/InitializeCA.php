<?php

namespace App\Console\Commands;

use App\Services\CAService;
use Illuminate\Console\Command;

class InitializeCA extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ca:initialize 
                            {--force : Force regeneration even if CA keys exist}
                            {--name= : CA name (default: Pipocoin Platform Certificate Authority)}
                            {--organization= : Organization name (default: Pipocoin Platform)}
                            {--ou= : Organizational Unit (default: Certificate Authority)}
                            {--country= : Country code (default: XX)}
                            {--email= : CA contact email (default: ca@pipocoin.platform)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Initialize the platform as a third-party Certificate Authority (CA)';

    /**
     * Execute the console command.
     */
    public function handle(CAService $caService): int
    {
        $this->info('Initializing Certificate Authority...');

        // Check if CA keys already exist
        if ($caService->caKeysExist() && !$this->option('force')) {
            $this->error('CA keys already exist. Use --force to regenerate them.');
            $this->warn('WARNING: Regenerating CA keys will invalidate all existing certificates!');
            return Command::FAILURE;
        }

        if ($this->option('force')) {
            $this->warn('WARNING: This will regenerate CA keys and invalidate all existing certificates!');
            if (!$this->confirm('Are you sure you want to continue?')) {
                $this->info('Operation cancelled.');
                return Command::SUCCESS;
            }
        }

        try {
            // Collect CA information
            $caInfo = [
                'name' => $this->option('name') ?: 'Pipocoin Platform Certificate Authority',
                'organization' => $this->option('organization') ?: 'Pipocoin Platform',
                'organizational_unit' => $this->option('ou') ?: 'Certificate Authority',
                'country' => $this->option('country') ?: 'XX',
                'email' => $this->option('email') ?: 'ca@pipocoin.platform',
            ];

            $this->info('Initializing third-party Certificate Authority...');
            $this->line('  Name: ' . $caInfo['name']);
            $this->line('  Organization: ' . $caInfo['organization']);
            $this->line('  OU: ' . $caInfo['organizational_unit']);
            $this->line('  Country: ' . $caInfo['country']);
            $this->line('  Email: ' . $caInfo['email']);
            $this->newLine();

            $ca = $caService->initializeCA($caInfo);
            
            $this->info('✓ Third-party CA initialized successfully!');
            $this->info('✓ CA entity created in database (ID: ' . $ca->id . ')');
            $this->info('✓ Public key stored at: ' . storage_path('app/ca/public_key.pem'));
            $this->info('✓ Private key stored via HSM service');
            
            $caInfo = $caService->getCAInfo();
            $this->newLine();
            $this->info('Certificate Authority Information:');
            $this->line('  CA ID: ' . $caInfo['id']);
            $this->line('  Name: ' . $caInfo['name']);
            $this->line('  Organization: ' . $caInfo['organization']);
            $this->line('  Distinguished Name: ' . $caInfo['distinguished_name']);
            $this->line('  Key Size: ' . $caInfo['key_size'] . ' bits');
            $this->line('  Public Key Fingerprint: ' . $caInfo['public_key_fingerprint']);
            $this->line('  Established: ' . $caInfo['established_at']);
            
            $this->newLine();
            $this->info('ROLE: The platform now acts as a third-party Certificate Authority.');
            $this->line('  - CA is independent from users');
            $this->line('  - CA issues certificates for transactions');
            $this->line('  - CA signs certificates with its own private key');
            $this->line('  - Users sign transactions with their own keys');
            
            $this->newLine();
            $this->warn('SECURITY NOTES:');
            $this->line('  - The CA private key is stored via HSMService');
            $this->line('  - For production, configure HSM_BACKEND to use Hardware Security Module');
            $this->line('  - Keep the app key secure and backed up');
            $this->line('  - Never expose the CA private key');
            
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Failed to initialize CA: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}

