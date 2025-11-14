<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class transanction extends Model
{
    protected $table = 'transanction';

    protected $fillable = [
        'sender_account_id',
        'receiver_account_id',
        'amount',
        'hash_trasaction',
        'signature',
        'status',
    ];
}
