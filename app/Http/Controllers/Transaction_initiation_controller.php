<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class Transaction_initiation_controller extends Controller
{
    public function Transaction(Request $request){
        $send= $request->input('Sender_Account_Number');
        $receive=$request->input('Receiver_Account_Number');
        
        $amount=$request->input('Amount');
        $amount=str_pad($amount, 9, '0', STR_PAD_LEFT);//le montant sur 9 chiffres
        $conca= $send.$receive.$amount;//les deux numéros de compte(9 chiffres) et le montant concaténés(9 chiffres)

        //Calcul du hash 
        //Récupération de la clé privée du destinataire
        $receiverAcc=\App\Models\compte::where('numero_compte',$receive)->first();
        $cle_receiver=\App\Models\cle::where('user_id',$receiverAcc->id)->first();
        $d=$cle_receiver->cle_privee;
        
        $h=pow($conca,$d);
         //recupération de la clé publique de l'expéditeur
        $senderAcc=\App\Models\compte::where('numero_compte',$send)->first();
        $public_key_sender=$senderAcc->cle_publique;
         //séparation e et n
        $e=substr($public_key_sender,0,13);
        $n=substr($public_key_sender,13,26);
         //chiffrement du hash
        $hash= $h % $n;

        //Signature de la transaction
         
        //Recupération de la clé privée de l'expéditeur
        $cle_sender=\App\Models\cle::where('user_id',$senderAcc->id)->first();
        $d_sender=$cle_sender->cle_privee;
         //chiffrement du hash avec la clé privée de l'expéditeur
        $signature= pow($hash,$d_sender);
         //Recupération de la clé publique du destinataire
        $public_key_receiver=$receiverAcc->cle_publique;
         //séparation e et n
        $e_receiver=substr($public_key_receiver,0,13);
        $n_receiver=substr($public_key_receiver,13,26);
         //Modulo n_receiver
        $signature= $signature % $n_receiver;

         //Création de la transaction
        $transaction= new \App\Models\transanction();
        $transaction->sender_account_id=$send;
        $transaction->receiver_account_id=$receive;
        $transaction->amount=$request->input('Amount');
        $transaction->hash_transaction=$hash;
        $transaction->signature=$signature;

    }
}
