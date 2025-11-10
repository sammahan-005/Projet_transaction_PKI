<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class Inscription_controller extends Controller
{
    public function Register(Request $request){
        $validator=validator(
            $request->all(), 
            [
            'Pseudo' => 'required|string|max:20',
            
            'Password' => 'required|string|min:5|max:255|regex:/^(?=.*[A-Z])(?=.*[\W_]).+$/',

            'Email'=>'required|email|max:255',
            ],
            
            [
            'Password.regex' => 'Le mot de passe doit contenir au moins une majuscule et un caractère spécial.',
            'Pseudo.required' => 'Le pseudo est obligatoire.',
            'Password.required' => 'Le mot de passe est obligatoire.',
            'Pseudo.max' => 'Le pseudo ne doit pas dépasser 20 caractères.',
            'Password.max' => 'Le mot de passe ne doit pas dépasser 255 caractères.',
            'Password.min' => 'Le mot de passe doit contenir au moins 5 caractères.',
            'Email.required' => 'L\'email est obligatoire.',
            'Email.email' => 'Le format de l\'email est invalide.',
            'Email.max' => 'L\'email ne doit pas dépasser 255 caractères.',
            ]
        
        );

        if($validator->fails()){
            return redirect()->back()->withErrors($validator)->withInput();
        }

        else{
            
            if(\App\Models\User::where('pseudo', $request->input('Pseudo'))->exists()){
                $errors = ['Pseudo' => 'Ce pseudo est déjà pris. Veuillez en choisir un autre.'];
                return redirect()->back()->withErrors($errors)->withInput();
            }

            elseif(\App\Models\User::where('email', $request->input('Email'))->exists()){
                $errors = ['Email' => 'Cet email est déjà utilisé. Veuillez en choisir un autre.'];
                return redirect()->back()->withErrors($errors)->withInput();
            }
            else{
                
                //Generation cle
                $p = rand(100000,999999);
                $q = rand(100000,999999);
                $n = $p * $q;
                $e = rand(100000,$n);
                while ($e % $n != 1) {
                    $e = rand(100000,$n);
                }
                
                //Determination de e et d
                $f = ($p - 1) * ($q - 1);
                $e = rand(100000,$f);
                while ($e % $n != 1) {
                    $e = rand(100000,$n);
                }
                
                $d = 1;
                while (($d * $e) % $f != 1) {
                    $d+=1;
                }
                //e,d et n sont mis sur 13 chiffres
                $pad_length = 1000000000000;
                $n = str_pad($n, $pad_length, "0", STR_PAD_RIGHT);
                $e = str_pad($e, $pad_length, "0", STR_PAD_RIGHT);
                $d = str_pad($d, $pad_length, "0", STR_PAD_RIGHT);

                //formartion cle publique et privee
                $cle_publique = $e.$n;
                $cle_privee = hash('sha256',$d);

                //Inscription utilisateur
                $user = new \App\Models\User();
                $user->pseudo = $request->input('Pseudo');
                $user->password = hash('sha256',$request->input('Password'));
                $user->email = $request->input('Email');
                $user->save();
                $messageIns= 'Inscription réussie ! Vous pouvez maintenant vous connecter.';
                return redirect('/Connexion')->with('messageIns', $messageIns);
            }
        }
    }
}
