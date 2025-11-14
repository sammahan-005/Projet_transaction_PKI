<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class compte extends Model
{
    protected $table = 'compte';

    protected $fillable = [
        'user_id',
        'numero_compte',
        'cle_publique',
        'solde',

    ];
}
