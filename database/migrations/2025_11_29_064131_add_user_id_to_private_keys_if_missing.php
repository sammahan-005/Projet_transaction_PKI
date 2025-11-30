<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if user_id column exists, if not add it
        if (Schema::hasTable('private_keys')) {
            if (!Schema::hasColumn('private_keys', 'user_id')) {
                Schema::table('private_keys', function (Blueprint $table) {
                    $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->onDelete('cascade');
                });
                
                // Update existing records to set user_id from account relationship
                // This handles cases where private_keys exist but user_id is missing
                DB::statement('
                    UPDATE private_keys pk
                    SET user_id = a.user_id
                    FROM accounts a
                    WHERE pk.account_id = a.id
                    AND pk.user_id IS NULL
                ');
                
                // Make user_id NOT NULL after populating it
                Schema::table('private_keys', function (Blueprint $table) {
                    $table->foreignId('user_id')->nullable(false)->change();
                });
                
                // Add index if it doesn't exist
                if (!$this->indexExists('private_keys', 'private_keys_user_id_index')) {
                    Schema::table('private_keys', function (Blueprint $table) {
                        $table->index('user_id');
                    });
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Only remove if it was added by this migration
        // In practice, you might want to keep user_id for data integrity
        // So we'll leave it commented out
        // Schema::table('private_keys', function (Blueprint $table) {
        //     $table->dropForeign(['user_id']);
        //     $table->dropColumn('user_id');
        // });
    }

    /**
     * Check if an index exists
     */
    private function indexExists(string $table, string $indexName): bool
    {
        $connection = Schema::getConnection();
        $database = $connection->getDatabaseName();
        
        $result = DB::select(
            "SELECT COUNT(*) as count 
             FROM pg_indexes 
             WHERE schemaname = 'public' 
             AND tablename = ? 
             AND indexname = ?",
            [$table, $indexName]
        );
        
        return $result[0]->count > 0;
    }
};
