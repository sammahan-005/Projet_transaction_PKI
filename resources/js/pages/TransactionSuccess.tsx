import { router } from '@inertiajs/react';
import { CheckCircle, Download, Home, ArrowLeft, XCircle, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import BottomNav from '../components/BottomNav';

interface TransactionSuccessProps {
  transaction: {
    id: number;
    amount: number;
    status: string;
    rejection_reason?: string | null;
    created_at: string;
    other_user: {
      name: string;
      account_number: string;
    };
    type: 'sent' | 'received';
  };
}

function TransactionSuccess({ transaction: initialTransaction }: TransactionSuccessProps) {
  const [transaction, setTransaction] = useState(initialTransaction);
  const [isPolling, setIsPolling] = useState(false);

  // Poll transaction status if it's still pending
  useEffect(() => {
    if (transaction.status === 'pending' && !isPolling) {
      setIsPolling(true);
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/transactions/${transaction.id}/status`);
          if (response.ok) {
            const data = await response.json();
            setTransaction((prev) => ({
              ...prev,
              status: data.status,
              rejection_reason: data.rejection_reason,
            }));
            
            // Stop polling if transaction is no longer pending
            if (data.status !== 'pending') {
              clearInterval(pollInterval);
              setIsPolling(false);
            }
          }
        } catch (error) {
          console.error('Error polling transaction status:', error);
          // Stop polling on error after a few attempts
          clearInterval(pollInterval);
          setIsPolling(false);
        }
      }, 2000); // Poll every 2 seconds

      // Stop polling after 30 seconds max
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsPolling(false);
      }, 30000);

      return () => clearInterval(pollInterval);
    }
  }, [transaction.status, transaction.id, isPolling]);

  const handleDownloadReceipt = () => {
    window.open(`/transactions/${transaction.id}/receipt`, '_blank');
  };

  const handleGoToDashboard = () => {
    router.visit('/dashboard');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isFailed = transaction.status === 'rejected' || transaction.status === 'failed';
  const isPending = transaction.status === 'pending';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleGoToDashboard}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Transaction</h1>
        </div>
      </header>

      {/* Success/Failure Content */}
      <div className="px-6 py-8">
        <div className="bg-white rounded-2xl p-8 text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            {isFailed ? (
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-16 h-16 text-red-500" />
              </div>
            ) : isPending ? (
              <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-16 h-16 text-yellow-500" />
              </div>
            ) : (
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
            )}
          </div>

          {/* Message */}
          <h2 className={`text-2xl font-bold mb-4 ${
            isFailed ? 'text-red-600' : isPending ? 'text-yellow-600' : 'text-gray-800'
          }`}>
            {isFailed 
              ? 'Transaction échouée' 
              : isPending 
              ? 'Transaction en cours de vérification...' 
              : 'Transaction effectuée avec succès'}
          </h2>

          {/* Rejection Reason */}
          {isFailed && transaction.rejection_reason && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700 font-medium mb-1">
                Raison: {transaction.rejection_reason}
              </p>
              {transaction.rejection_reason?.includes('Signature') && (
                <p className="text-xs text-red-600 mt-2 opacity-80">
                  Vérifiez que votre clé privée correspond bien à votre compte. 
                  Si le problème persiste, contactez le support.
                </p>
              )}
            </div>
          )}

          {/* Transaction Details */}
          <div className="bg-gray-50 rounded-xl p-6 my-6 text-left">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Montant:</span>
                <span className={`text-xl font-bold ${transaction.type === 'sent' ? 'text-red-600' : 'text-green-600'}`}>
                  {transaction.type === 'sent' ? '-' : '+'}
                  {transaction.amount.toLocaleString('fr-FR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} ₱
                </span>
              </div>
              
              <div className="pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">
                    {transaction.type === 'sent' ? 'Envoyé à:' : 'Reçu de:'}
                  </span>
                  <span className="text-base font-semibold text-gray-800">
                    {transaction.other_user.name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Compte:</span>
                  <span className="text-sm text-gray-700 font-mono">
                    {transaction.other_user.account_number}
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Date:</span>
                  <span className="text-sm text-gray-700">
                    {formatDate(transaction.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mt-8">
            {!isFailed && (
              <button
                onClick={handleDownloadReceipt}
                className="w-full bg-gradient-to-r from-[#FF9500] via-[#FF8C00] to-[#E07B00] hover:opacity-90 text-white font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3"
              >
                <Download className="w-5 h-5" />
                <span>Télécharger le reçu</span>
              </button>
            )}

            <button
              onClick={handleGoToDashboard}
              className={`w-full font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 ${
                isFailed
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-white hover:bg-gray-50 text-[#FF8C00]'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Retour au tableau de bord</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export default TransactionSuccess;

