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
        Schema::create('certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained('transactions')->onDelete('cascade');
            $table->text('certificate_data'); // X.509 certificate in PEM format
            $table->string('serial_number')->unique();
            $table->timestamp('issued_at');
            $table->timestamp('expires_at');
            $table->text('issuer'); // Certificate issuer information
            $table->text('subject'); // Certificate subject information
            $table->text('signature'); // Digital signature of the certificate
            $table->timestamps();

            $table->index('transaction_id');
            $table->index('serial_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('certificates');
    }
};
