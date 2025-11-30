<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->user();

        if (!$user) {
            return redirect()->route('home');
        }

        // Check if user is admin - you can customize this logic
        // For now, we'll check if email contains 'admin' or is in a config list
        $adminEmails = config('app.admin_emails', []);
        $isAdmin = in_array($user->email, $adminEmails) || 
                   str_contains(strtolower($user->email), 'admin') ||
                   str_contains(strtolower($user->name), 'admin');

        if (!$isAdmin) {
            abort(403, 'Unauthorized. Admin access required.');
        }

        return $next($request);
    }
}

