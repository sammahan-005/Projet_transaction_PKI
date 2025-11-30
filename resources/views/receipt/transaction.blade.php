<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reçu de Transaction - Polytech</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Arial', sans-serif;
            background: white;
            color: #000;
            padding: 40px;
            line-height: 1.6;
        }
        .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border: 3px solid #FF8C00;
            border-radius: 10px;
            padding: 40px;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 3px solid #FF8C00;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #FF8C00;
            margin-bottom: 10px;
        }
        .receipt-title {
            font-size: 24px;
            font-weight: bold;
            color: #000;
            margin-top: 10px;
        }
        .transaction-details {
            margin: 30px 0;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 15px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: bold;
            color: #000;
        }
        .detail-value {
            color: #333;
        }
        .amount-highlight {
            font-size: 28px;
            font-weight: bold;
            color: #FF8C00;
            text-align: center;
            padding: 20px;
            margin: 30px 0;
            background: #FFF5E6;
            border-radius: 8px;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 30px;
            border-top: 2px solid #FF8C00;
            color: #666;
            font-size: 12px;
        }
        .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            background: #4CAF50;
            color: white;
        }
        .orange-divider {
            height: 4px;
            background: linear-gradient(90deg, transparent, #FF8C00, transparent);
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="header">
            <div class="logo">POLYTECH</div>
            <div class="orange-divider"></div>
            <div class="receipt-title">Reçu de Transaction</div>
        </div>

        <div class="transaction-details">
            <div class="detail-row">
                <span class="detail-label">Numéro de Transaction:</span>
                <span class="detail-value">#{{ str_pad($transaction->id, 8, '0', STR_PAD_LEFT) }}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">{{ $transaction->created_at->format('d/m/Y à H:i') }}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Statut:</span>
                <span class="detail-value">
                    <span class="status-badge">{{ strtoupper($transaction->status) }}</span>
                </span>
            </div>
            
            <div class="orange-divider"></div>
            
            @if($isSender)
            <div class="detail-row">
                <span class="detail-label">Envoyé à:</span>
                <span class="detail-value">{{ $transaction->receiverAccount->user->name }}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Numéro de compte:</span>
                <span class="detail-value">{{ $transaction->receiverAccount->account_number }}</span>
            </div>
            @else
            <div class="detail-row">
                <span class="detail-label">Reçu de:</span>
                <span class="detail-value">{{ $transaction->senderAccount->user->name }}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Numéro de compte:</span>
                <span class="detail-value">{{ $transaction->senderAccount->account_number }}</span>
            </div>
            @endif
            
            <div class="orange-divider"></div>
            
            <div class="amount-highlight">
                @if($isSender)
                    -{{ number_format($transaction->amount, 2, ',', ' ') }} ₱
                @else
                    +{{ number_format($transaction->amount, 2, ',', ' ') }} ₱
                @endif
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Votre compte:</span>
                <span class="detail-value">{{ $isSender ? $transaction->senderAccount->account_number : $transaction->receiverAccount->account_number }}</span>
            </div>
            
            @if($transaction->status === 'approved')
            <div class="detail-row">
                <span class="detail-label">Solde après transaction:</span>
                <span class="detail-value">{{ number_format($isSender ? $transaction->senderAccount->balance : $transaction->receiverAccount->balance, 2, ',', ' ') }} ₱</span>
            </div>
            @endif
        </div>

        <div class="footer">
            <p>Ce document certifie la transaction ci-dessus.</p>
            <p>Merci d'utiliser le système de transaction Polytech.</p>
            <p style="margin-top: 10px;">Reçu généré le {{ now()->format('d/m/Y à H:i') }}</p>
        </div>
    </div>
</body>
</html>

