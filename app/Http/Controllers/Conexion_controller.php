<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class Conexion_controller extends Controller
{
    public function connect(Request $request)
    {
         $validator=validator(
            $request->all(), 
            [
            'Pseudo' => 'required',
            
            'Password' => 'required',

            'Email'=>'required|email',
            ],
            
            [
            
            'Pseudo.required' => 'Le pseudo est obligatoire.',
            'Password.required' => 'Le mot de passe est obligatoire.',
            'Email.required' => 'L\'email est obligatoire.',
            'Email.email' => 'Le format de l\'email est invalide.',
            ]
        
        );

        if($validator->fails()){
            return redirect()->back()->withErrors($validator)->withInput();
        }

        else{
            $user=\App\Models\User::where('pseudo',$request->input('Pseudo'))
            ->where('email',$request->input('Email'))
            ->where('password',$request->input('Password'))
            ->first();

            if($user){
                // Authentification réussie
                // Stockage les informations de l'utilisateur dans la session
                $request->session()->put('user_id', $user->id);
                return redirect()->route('dashboard'); // Rediriger vers le tableau de bord ou une autre page protégée
            }else{
                // Échec de l'authentification
                $errors = ['authentication' => 'Pseudo, email ou mot de passe incorrect.'];
                return redirect()->back()->withErrors($errors)->withInput();
            }
        }

    }
}
