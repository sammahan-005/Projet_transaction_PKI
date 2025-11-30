import { useMemo } from 'react';
import { router } from '@inertiajs/react';
import { ArrowLeft, Calendar } from 'lucide-react';
import TransactionItem from '../components/TransactionItem';
import BottomNav from '../components/BottomNav';
import type { Transaction } from '../types';

interface HistoryTransaction {
  id: string;
  type: 'send' | 'receive';
  amount: number;
  date: string;
  sender?: string | null;
  recipient?: string | null;
  sender_email?: string | null;
  recipient_email?: string | null;
  sender_profile_picture?: string | null;
  recipient_profile_picture?: string | null;
  status: string;
}

interface HistoryProps {
  transactions: HistoryTransaction[];
  account?: {
    id: number;
    account_number: string;
    balance: number;
  } | null;
  current_balance: number;
  total_received: number;
  total_sent: number;
}

function History({ 
  transactions: serverTransactions = [], 
  account,
  current_balance = 0,
  total_received = 0,
  total_sent = 0,
}: HistoryProps) {
  // Convert server transactions to Transaction format
  const transactions = useMemo<Transaction[]>(() => {
    return serverTransactions.map((t) => {
      const otherUserProfilePicture = t.type === 'receive' 
        ? t.sender_profile_picture 
        : t.recipient_profile_picture;
      
      // Use profile picture if available, otherwise fallback to email-based avatar
      let avatarUrl: string | undefined;
      if (otherUserProfilePicture) {
        avatarUrl = otherUserProfilePicture;
      } else if (t.type === 'receive' && t.sender_email) {
        avatarUrl = `https://i.pravatar.cc/150?u=${t.sender_email}`;
      } else if (t.type === 'send' && t.recipient_email) {
        avatarUrl = `https://i.pravatar.cc/150?u=${t.recipient_email}`;
      }
      
      return {
        id: t.id,
        type: t.type,
        amount: t.amount,
        date: new Date(t.date),
        sender: t.sender || undefined,
        recipient: t.recipient || undefined,
        avatarUrl,
      };
    });
  }, [serverTransactions]);

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};

    transactions.forEach((transaction) => {
      const date = transaction.date;
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = "Aujourd'hui";
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Hier';
      } else {
        groupKey = date.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(transaction);
    });

    return groups;
  }, [transactions]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.visit('/dashboard')}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Historique</h1>
        </div>
      </header>

      {/* Summary Stats */}
      <div className="px-6 py-6">
        <div className="bg-gradient-to-br from-[#FF9500] via-[#FF8C00] to-[#E07B00] rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span className="text-sm opacity-90">Ce mois-ci</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm opacity-80 mb-1">Total reçu</p>
              <p className="text-2xl font-bold">
                +{Number(total_received).toLocaleString('fr-FR', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })} ₱
              </p>
            </div>
            <div>
              <p className="text-sm opacity-80 mb-1">Total envoyé</p>
              <p className="text-2xl font-bold">
                -{Number(total_sent).toLocaleString('fr-FR', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })} ₱
              </p>
            </div>
          </div>
          {account && (
            <div className="mt-4 pt-4">
              <p className="text-sm opacity-80 mb-1">Solde actuel</p>
              <p className="text-3xl font-bold">
                {Number(current_balance).toLocaleString('fr-FR', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })} ₱
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Transactions List by Date */}
      <div className="px-6 space-y-6 pb-4">
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <p className="text-gray-500">Aucune transaction trouvée</p>
            <p className="text-sm text-gray-400 mt-2">
              Vos transactions approuvées apparaîtront ici
            </p>
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([date, dateTransactions]) => (
            <div key={date}>
              <h2 className="text-sm font-bold text-gray-600 mb-3 px-2">{date}</h2>
              <div className="bg-white rounded-2xl px-4">
                {dateTransactions.map((transaction) => (
                  <TransactionItem key={transaction.id} transaction={transaction} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export default History;
