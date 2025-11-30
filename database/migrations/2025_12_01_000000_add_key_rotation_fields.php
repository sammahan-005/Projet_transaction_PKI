<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add key rotation fields to accounts table
        Schema::table('accounts', function (Blueprint $table) {
            $table->integer('key_version')->default(1)->after('public_key');
            $table->timestamp('key_rotated_at')->nullable()->after('key_version');
        });

        // Add key rotation fields to private_keys table
        Schema::table('private_keys', function (Blueprint $table) {
            $table->integer('key_version')->nullable()->after('encrypted_key_params');
            $table->timestamp('deprecated_at')->nullable()->after('key_version');
            $table->string('deprecated_reason')->nullable()->after('deprecated_at');
        });

        // Create ephemeral_keys table for session keys
        Schema::create('ephemeral_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('account_id')->constrained('accounts')->onDelete('cascade');
            $table->string('session_id', 64)->unique();
            $table->text('public_key'); // Ephemeral public key
            $table->timestamp('expires_at'); // When the key expires
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('session_id');
            $table->index('user_id');
            $table->index('account_id');
            $table->index('expires_at');
            $table->index(['is_active', 'expires_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ephemeral_keys');

        Schema::table('private_keys', function (Blueprint $table) {
            $table->dropColumn(['key_version', 'deprecated_at', 'deprecated_reason']);
        });

        Schema::table('accounts', function (Blueprint $table) {
            $table->dropColumn(['key_version', 'key_rotated_at']);
        });
    }
};

