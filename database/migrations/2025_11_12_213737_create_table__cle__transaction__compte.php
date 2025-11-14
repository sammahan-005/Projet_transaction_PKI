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
       Schema::create('transaction', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_account_id')->constrained('compte')->onDelete('cascade');
            $table->foreignId('receiver_account_id')->constrained('compte')->onDelete('cascade');
            $table->decimal('amount', 15, 2);//15 chiffres au total dont 2 apres la virgule
            $table->string('hash_transaction');
            $table->string('signature');
            $table->string('status')->default('pending');//par defaut pending
            $table->timestamps();
            
        });
        

       
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('table__cle__transaction__compte');
    }
};
