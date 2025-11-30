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
     * Makes encrypted_private_key nullable to support client-side key generation.
     * When null, it indicates the private key is stored client-side only.
     */
    public function up(): void
    {
        if (Schema::hasTable('private_keys')) {
            // For PostgreSQL, we need to use raw SQL to change the column
            DB::statement('ALTER TABLE private_keys ALTER COLUMN encrypted_private_key DROP NOT NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('private_keys')) {
            // Before making it NOT NULL, we need to ensure no NULL values exist
            // Set a placeholder for any NULL values (though this shouldn't happen in practice)
            DB::statement("
                UPDATE private_keys 
                SET encrypted_private_key = '' 
                WHERE encrypted_private_key IS NULL
            ");
            
            // Now make it NOT NULL
            DB::statement('ALTER TABLE private_keys ALTER COLUMN encrypted_private_key SET NOT NULL');
        }
    }
};
