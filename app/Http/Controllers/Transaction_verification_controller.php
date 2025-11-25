<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class Transaction_verification_controller extends Controller
{
    public function verif(){
        if (\App\Models\transanction::where('status', 'pending')->exists()) {
            $transactions = \App\Models\transanction::where('status', 'pending')->get();
            foreach ($transactions as $transaction) {
                $send = $transaction->sender_account_id;
                $receive = $transaction->receiver_account_id;
                $amount = $transaction->amount;
                $amount = str_pad($amount, 9, '0', STR_PAD_LEFT); // le montant sur 9 chiffres
                $conca = $send . $receive . $amount; // les deux numéros de compte(9 chiffres) et le montant concaténés(9 chiffres)
                
                // Recalcul du hash
                $hash = hash('sha256', $conca);
                $hash = hexdec(substr($hash, 0, 15)); // conversion en décimal et prise des 15 premiers caractères
                $verif_hash = \App\Models\transanction:: where('hash_transaction', $hash)->first();
                if ($verif_hash) {
                    //verification de la signature
                    //Recupération de la clé privee de l'expéditeur
                    $senderAcc = $transaction->sender_account_id;
                    $sAcc = \App\Models\cle :: where('account_id', $senderAcc)->first();
                    $clepriv = $sAcc->cle_privee;

                    //chiffrement du hash avec la clé privée de l'expéditeur
                    $signature = pow($hash, $clepriv);

                    //Recupération de la clé publique du destinataire
                    $receiverAcc = $transaction->receiver_account_id;
                    $rAcc = \App\Models\compte :: where('numero_compte', $receiverAcc)->first();
                    $clepub = $rAcc->cle_publique;
                    //séparation e et n
                    $e_receiver = substr($clepub, 0, 13);
                    $n_receiver = substr($clepub, 13, 26);
                    //Modulo n_receiver
                    $signature = $signature % $n_receiver;//ceci est la signature obtenue

                    if ($signature == $transaction->signature) {
                        // La signature est valide
                        $solde_sender = $sAcc->solde;
                        if ($solde_sender >= $transaction->amount) {
                            // Mettre à jour les soldes des comptes
                            $sAcc->solde -= $transaction->amount;//debit du compte expéditeur
                            $sAcc->save();
                            $rAcc->solde += $transaction->amount;//credit du compte destinataire
                            $rAcc->save();  
                            $transaction->status = 'approved';
                            $transaction->save();
                    } else {
                        // La signature n'est pas valide
                        $transaction->status = 'rejected';
                        $transaction->save();
                        continue; // Passer à la transaction suivante
                        
                    }
                }else {
                    // Le hash ne correspond pas
                    $transaction->status = 'rejected';
                    $transaction->save();
                    continue; // Passer à la transaction suivante
                }


               
            };
    }
}
}
}