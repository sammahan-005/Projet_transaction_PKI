import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import TransactionItem from '../components/TransactionItem';
import BottomNav from '../components/BottomNav';
import type { Transaction } from '../types';

interface LocationState {
  beneficiary: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string;
  };
}

// Helper function to generate mock transaction history
const getMockTransactionHistory = (beneficiary: { name: string; avatarUrl: string }): Transaction[] => {
  const now = Date.now();
  const oneDay = 86400000;

  return [
    {
      id: '1',
      type: 'send',
      amount: 50.0,
      date: new Date(now - oneDay),
      recipient: beneficiary.name,
      avatarUrl: beneficiary.avatarUrl,
    },
    {
      id: '2',
      type: 'receive',
      amount: 75.0,
      date: new Date(now - oneDay * 3),
      sender: beneficiary.name,
      avatarUrl: beneficiary.avatarUrl,
    },
    {
      id: '3',
      type: 'send',
      amount: 30.0,
      date: new Date(now - oneDay * 7),
      recipient: beneficiary.name,
      avatarUrl: beneficiary.avatarUrl,
    },
  ];
};

function SendAmountPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { beneficiary } = (location.state as LocationState) || {};

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  // Get transaction history with this user
  const transactionHistory = useMemo<Transaction[]>(() => {
    if (!beneficiary) return [];
    return getMockTransactionHistory(beneficiary);
  }, [beneficiary]);

  const handleSend = useCallback(() => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Veuillez entrer un montant valide');
      return;
    }

    // Process the payment
    console.log('Sending', amount, 'to', beneficiary?.name, 'Note:', note);
    alert(`${amount} ₱ envoyé à ${beneficiary?.name} avec succès!`);
    navigate('/');
  }, [amount, note, beneficiary, navigate]);

  const handleAmountClick = useCallback((value: string) => {
    setAmount(value);
  }, []);

  if (!beneficiary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Aucun bénéficiaire sélectionné</p>
          <button
            onClick={() => navigate('/send')}
            className="bg-[#FF8C00] text-white px-6 py-2 rounded-full"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Envoyer de l'argent</h1>
        </div>
      </header>

      {/* Recipient Info */}
      <div className="px-6 py-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <img
            src={beneficiary.avatarUrl}
            alt={beneficiary.name}
            className="w-16 h-16 rounded-full object-cover ring-4 ring-[#FF8C00] ring-opacity-20"
          />
          <div className="flex-1">
            <p className="text-lg font-bold text-gray-800">{beneficiary.name}</p>
            <p className="text-sm text-gray-500">{beneficiary.username}</p>
          </div>
        </div>
      </div>

      {/* Amount Input */}
      <div className="px-6 pb-6">
        <div className="bg-gradient-to-br from-[#FF9500] via-[#FF8C00] to-[#E07B00] rounded-2xl p-8 text-white shadow-lg">
          <p className="text-sm opacity-80 mb-2 text-center">Montant à envoyer</p>
          <div className="flex items-center justify-center gap-2 mb-6">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="bg-transparent text-5xl font-bold text-center text-white placeholder-white placeholder-opacity-50 outline-none w-full"
              style={{ textAlign: 'center' }}
            />
            <span className="text-5xl font-bold">₱</span>
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {['10', '50', '100', '500'].map((value) => (
              <button
                key={value}
                onClick={() => handleAmountClick(value)}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-[#FF9500] py-2 px-3 rounded-xl font-semibold transition-colors"
              >
                {value}₱
              </button>
            ))}
          </div>
            <button
          onClick={handleSend}
          className="w-full bg-white hover:opacity-90 text-[#FF9500] font-bold py-4 px-6 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3"
        >
          <Send className="w-5 h-5" />
          <span>Envoyer</span>
        </button>
         
        </div>
      </div>

      {/* Send Button */}
      <div className="px-6 pb-6">
        
      </div>

      {/* Transaction History with this user */}
      <div className="px-6 pb-4">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Historique avec {beneficiary.name}</h2>
        {transactionHistory.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-500 shadow-sm border border-gray-100">
            Aucune transaction avec cet utilisateur
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4">
            {transactionHistory.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export default SendAmountPage;
