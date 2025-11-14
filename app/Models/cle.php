<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class cle extends Model
{
   
    protected $table = 'cle';
    protected $fillable = [
        'user_id',
        'cle_privee',
    ];

    protected $casts = [
        // Utilisation du cast natif 'encrypted' de Laravel
        'cle_privee' => 'encrypted', 
    ];
}
