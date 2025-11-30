<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Creates the certificate_authorities table to represent the platform
     * as a third-party Certificate Authority (CA).
     */
    public function up(): void
    {
        Schema::create('certificate_authorities', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // CA name (e.g., "Pipocoin Platform CA")
            $table->string('organization'); // Organization name
            $table->string('organizational_unit')->nullable(); // OU (e.g., "Certificate Authority")
            $table->string('country', 2)->default('XX'); // Country code
            $table->string('email')->nullable(); // CA contact email
            $table->text('public_key'); // CA public key (PEM format)
            $table->string('public_key_fingerprint', 100); // SHA-256 fingerprint (with colons: 95 chars)
            $table->integer('key_size')->default(4096); // Key size in bits
            $table->boolean('is_active')->default(true); // Only one active CA at a time
            $table->timestamp('established_at'); // When CA was established
            $table->timestamps();

            // Indexes
            $table->index('is_active');
            $table->index('public_key_fingerprint');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('certificate_authorities');
    }
};
