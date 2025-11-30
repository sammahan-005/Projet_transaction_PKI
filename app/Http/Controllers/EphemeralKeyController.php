<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Services\EphemeralKeyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class EphemeralKeyController extends Controller
{
    protected EphemeralKeyService $ephemeralKeyService;

    public function __construct(EphemeralKeyService $ephemeralKeyService)
    {
        $this->ephemeralKeyService = $ephemeralKeyService;
    }

    /**
     * Register an ephemeral public key for the current session
     * 
     * POST /api/ephemeral-keys/register
     * Body: { public_key: string, lifetime?: number }
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'public_key' => 'required|string',
            'lifetime' => 'nullable|integer|min:60|max:86400', // 1 minute to 24 hours
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 400);
        }

        $user = auth()->user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        $account = Account::where('user_id', $user->id)
            ->where('is_active', true)
            ->first();

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'No active account found',
            ], 404);
        }

        try {
            // Validate public key format
            if (!$this->isValidPublicKeyPem($request->public_key)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid public key format',
                ], 400);
            }

            $lifetime = $request->input('lifetime');
            $ephemeralKey = $this->ephemeralKeyService->registerEphemeralKey(
                $account,
                $request->public_key,
                $lifetime
            );

            return response()->json([
                'success' => true,
                'session_id' => $ephemeralKey->session_id,
                'expires_at' => $ephemeralKey->expires_at->toIso8601String(),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to register ephemeral key: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to register ephemeral key',
            ], 500);
        }
    }

    /**
     * Deactivate an ephemeral key (end session)
     * 
     * POST /api/ephemeral-keys/deactivate
     * Body: { session_id: string }
     */
    public function deactivate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'session_id' => 'required|string|size:64',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 400);
        }

        $user = auth()->user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        $sessionId = $request->input('session_id');
        $success = $this->ephemeralKeyService->deactivateKey($sessionId);

        return response()->json([
            'success' => $success,
            'message' => $success ? 'Session ended' : 'Session not found',
        ]);
    }

    /**
     * Validate public key PEM format
     */
    private function isValidPublicKeyPem(string $publicKeyPem): bool
    {
        if (strpos($publicKeyPem, '-----BEGIN PUBLIC KEY-----') === false) {
            return false;
        }

        if (strpos($publicKeyPem, '-----END PUBLIC KEY-----') === false) {
            return false;
        }

        try {
            $publicKey = openssl_pkey_get_public($publicKeyPem);
            if ($publicKey === false) {
                return false;
            }
            openssl_free_key($publicKey);
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
}

