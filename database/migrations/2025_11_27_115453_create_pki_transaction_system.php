<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates a complete PKI-based transaction system with:
     * - Accounts table with public keys and balances
     * - Private keys table (encrypted)
     * - Transactions table with digital signatures
     * - PostgreSQL constraints for data integrity
     * - Indexes for performance
     */
    public function up(): void
    {
        // Create accounts table
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('account_number', 20)->unique(); // Account number (e.g., 9 digits)
            $table->text('public_key'); // RSA public key (e, n)
            $table->decimal('balance', 15, 2)->default(0.00); // Account balance
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Indexes for performance
            $table->index('account_number');
            $table->index('user_id');
        });

        // Add check constraint for balance using raw SQL
        DB::statement('ALTER TABLE accounts ADD CONSTRAINT positive_balance CHECK (balance >= 0)');

        // Create private_keys table (encrypted storage)
        Schema::create('private_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('account_id')->constrained('accounts')->onDelete('cascade');
            $table->text('encrypted_private_key'); // Encrypted RSA private key (d)
            $table->text('encrypted_key_params')->nullable(); // Encrypted p, q for backup
            $table->timestamps();

            // Unique constraint: one private key per account
            $table->unique('account_id');
            $table->index('user_id');
        });

        // Create transactions table with PKI signatures
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_account_id')->constrained('accounts')->onDelete('restrict');
            $table->foreignId('receiver_account_id')->constrained('accounts')->onDelete('restrict');
            $table->decimal('amount', 15, 2); // Transaction amount
            $table->text('transaction_hash'); // SHA-256 hash of transaction data
            $table->text('digital_signature'); // RSA signature of the hash
            $table->enum('status', ['pending', 'approved', 'rejected', 'failed'])->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamps();

            // Indexes for queries
            $table->index('sender_account_id');
            $table->index('receiver_account_id');
            $table->index('status');
            $table->index('created_at');
        });

        // Add check constraints using raw SQL
        DB::statement('ALTER TABLE transactions ADD CONSTRAINT positive_amount CHECK (amount > 0)');
        DB::statement('ALTER TABLE transactions ADD CONSTRAINT different_accounts CHECK (sender_account_id != receiver_account_id)');

        // Create transaction_logs for audit trail
        Schema::create('transaction_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained('transactions')->onDelete('cascade');
            $table->enum('action', ['created', 'verified', 'approved', 'rejected', 'failed']);
            $table->text('details')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('logged_at')->useCurrent();

            $table->index('transaction_id');
            $table->index('logged_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transaction_logs');
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('private_keys');
        Schema::dropIfExists('accounts');
    }
};
