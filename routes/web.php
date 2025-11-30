<?php

use App\Http\Controllers\TransactionController;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Laravel\Fortify\Features;

// Authentication routes (Pipocoin Auth page)
Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }
    return Inertia::render('Auth', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('/auth', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }
    return Inertia::render('Auth', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('auth');

Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard - Home page (Pipocoin Home)
    Route::get('/dashboard', [TransactionController::class, 'getTransactions'])->name('dashboard');

    // Send Money Flow
    Route::get('/send', function () {
        return Inertia::render('SendMoney');
    })->name('send');

    Route::get('/send-amount', function (Illuminate\Http\Request $request) {
        $user = auth()->user();
        $account = App\Models\Account::where('user_id', $user->id)->first();
        
        $beneficiary = null;
        
        // Get beneficiary from request (Inertia passes it as input/query)
        $beneficiaryData = $request->input('beneficiary') ?? $request->query('beneficiary');
        
        if ($beneficiaryData) {
            // If it's already an array (from Inertia), use it directly
            if (is_array($beneficiaryData)) {
                $beneficiary = $beneficiaryData;
            } 
            // If it's a JSON string, decode it
            elseif (is_string($beneficiaryData)) {
                $decoded = json_decode($beneficiaryData, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $beneficiary = $decoded;
                }
            }
        }
        
        return Inertia::render('SendAmountPage', [
            'beneficiary' => $beneficiary,
            'account' => $account ? [
                'account_number' => $account->account_number,
            ] : null,
        ]);
    })->name('send-amount');

    // QR Code pages
    Route::get('/qrcode', function () {
        $user = auth()->user();
        $account = App\Models\Account::where('user_id', $user->id)->first();

        return Inertia::render('QRCodePage', [
            'account_number' => $account ? $account->account_number : null,
            'user_name' => $user->name,
        ]);
    })->name('qrcode');

    Route::get('/scan', function () {
        return Inertia::render('ScanPage');
    })->name('scan');

    // Transaction History
    Route::get('/history', [TransactionController::class, 'getTransactionHistory'])->name('history');

    // Profile
    Route::get('/profile', function () {
        $user = auth()->user();
        $account = App\Models\Account::where('user_id', $user->id)->first();

        return Inertia::render('Profile', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone ?? null,
                'date_of_birth' => $user->date_of_birth ? $user->date_of_birth->format('Y-m-d') : null,
                'profile_picture' => $user->profile_picture ?? null,
                'created_at' => $user->created_at->toISOString(),
            ],
            'account' => $account ? [
                'id' => $account->id,
                'account_number' => $account->account_number,
                'balance' => (float) $account->balance,
                'is_active' => (bool) $account->is_active,
                'created_at' => $account->created_at->toISOString(),
            ] : null,
        ]);
    })->name('profile');

    // API: Get account info (for private key migration)
    Route::get('/api/account-info', function () {
        $user = auth()->user();
        $account = App\Models\Account::where('user_id', $user->id)->first();
        
        return response()->json([
            'account_number' => $account ? $account->account_number : null,
            'email' => $user->email,
            'public_key' => $account ? $account->public_key : null,
        ]);
    })->name('api.account-info');

    // Profile Update
    Route::post('/profile/update', function (Illuminate\Http\Request $request) {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'profile_picture' => 'nullable|string', // Base64 encoded image
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $user = auth()->user();
        $user->name = $request->name;
        
        // Handle profile picture (base64)
        if ($request->has('profile_picture') && $request->profile_picture) {
            // Validate base64 image
            $imageData = $request->profile_picture;
            
            // Check if it's a valid base64 image
            if (preg_match('/^data:image\/(\w+);base64,/', $imageData, $matches)) {
                $user->profile_picture = $imageData;
            } elseif (base64_decode($imageData, true) !== false) {
                // If just base64 without data URI, add data URI
                $user->profile_picture = 'data:image/png;base64,' . $imageData;
            } else {
                return back()->withErrors(['profile_picture' => 'Format d\'image invalide'])->withInput();
            }
        } elseif ($request->has('profile_picture') && !$request->profile_picture) {
            // Empty string means remove profile picture
            $user->profile_picture = null;
        }

        $user->save();

        return redirect()->route('profile')->with('success', 'Profil mis à jour avec succès!');
    })->name('profile.update');

    // PIN Update
    Route::post('/profile/update-pin', function (Illuminate\Http\Request $request) {
        $user = auth()->user();
        
        // Determine if current PIN is required
        $currentPinRequired = $user->transaction_pin ? 'required' : 'nullable';
        
        $validator = Validator::make($request->all(), [
            'current_pin' => $currentPinRequired . '|string|size:4',
            'new_pin' => 'required|string|size:4|confirmed',
            'new_pin_confirmation' => 'required|string|size:4',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        // If user has a PIN, verify current PIN
        if ($user->transaction_pin) {
            if (!$request->current_pin || strlen($request->current_pin) !== 4) {
                return back()->withErrors(['current_pin' => 'Le code PIN actuel est requis'])->withInput();
            }
            
            if (!Hash::check($request->current_pin, $user->transaction_pin)) {
                return back()->withErrors(['current_pin' => 'Code PIN actuel incorrect'])->withInput();
            }
        }

        // Validate that new PIN is numeric
        if (!ctype_digit($request->new_pin)) {
            return back()->withErrors(['new_pin' => 'Le code PIN doit contenir uniquement des chiffres'])->withInput();
        }

        // Update PIN
        $user->transaction_pin = $request->new_pin; // Will be hashed automatically due to cast
        $user->save();

        return redirect()->route('profile')->with('success', 'Code PIN mis à jour avec succès!');
    })->name('profile.update-pin');

    // Transaction API routes
    Route::post('/transactions/create', [TransactionController::class, 'createTransaction'])->name('transactions.create');
    Route::get('/transactions/success/{transaction_id}', [TransactionController::class, 'transactionSuccess'])->name('transaction.success');
    Route::get('/transactions/{transaction_id}/receipt', [TransactionController::class, 'downloadReceipt'])->name('transaction.receipt');
    Route::get('/api/transactions/{transaction_id}/status', [TransactionController::class, 'getTransactionStatus'])->name('api.transaction.status');
    
    // Ephemeral key management
    Route::post('/api/ephemeral-keys/register', [App\Http\Controllers\EphemeralKeyController::class, 'register']);
    Route::post('/api/ephemeral-keys/deactivate', [App\Http\Controllers\EphemeralKeyController::class, 'deactivate']);
    Route::get('/api/beneficiaries', [TransactionController::class, 'getBeneficiaries'])->name('api.beneficiaries');
    Route::get('/api/beneficiary', [TransactionController::class, 'getBeneficiaryByAccountNumber'])->name('api.beneficiary.by-account-number');

    // Notifications
    Route::get('/notifications', [TransactionController::class, 'getNotifications'])->name('notifications');
    Route::post('/notifications/{id}/read', [TransactionController::class, 'markNotificationAsRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [TransactionController::class, 'markAllNotificationsAsRead'])->name('notifications.read-all');
});

// Admin routes (public access, no login required)
Route::prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', [\App\Http\Controllers\AdminController::class, 'dashboard'])->name('dashboard');
    Route::get('/pki-workflow', [\App\Http\Controllers\AdminController::class, 'getPKIWorkflow'])->name('pki-workflow');
    Route::get('/disputes', [\App\Http\Controllers\AdminController::class, 'disputes'])->name('disputes');
    Route::get('/disputes/{disputeType}', [\App\Http\Controllers\AdminController::class, 'disputeDetail'])->name('dispute.detail');
    Route::get('/users', [\App\Http\Controllers\AdminController::class, 'users'])->name('users');
    Route::post('/users/{user}/increase-balance', [\App\Http\Controllers\AdminController::class, 'increaseBalance'])->name('users.increase-balance');
});

require __DIR__.'/settings.php';
