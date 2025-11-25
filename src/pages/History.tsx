import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import TransactionItem from '../components/TransactionItem';
import BottomNav from '../components/BottomNav';
import type { Transaction } from '../types';

function History() {
  const navigate = useNavigate();

  const transactions = useMemo<Transaction[]>(() => {
    const now = Date.now();
    const oneDay = 86400000;
    return [
      {
        id: '1',
        type: 'receive',
        amount: 250.0,
        date: new Date(now),
        sender: 'Jean Dupont',
        avatarUrl: 'https://i.pravatar.cc/150?img=12',
      },
      {
        id: '2',
        type: 'send',
        amount: 120.5,
        date: new Date(now - oneDay),
        recipient: 'Marie Martin',
        avatarUrl: 'https://i.pravatar.cc/150?img=5',
      },
      {
        id: '3',
        type: 'receive',
        amount: 500.0,
        date: new Date(now - oneDay),
        sender: 'Pierre Bernard',
        avatarUrl: 'https://i.pravatar.cc/150?img=33',
      },
      {
        id: '4',
        type: 'send',
        amount: 75.25,
        date: new Date(now - oneDay * 2),
        recipient: 'Sophie Laurent',
        avatarUrl: 'https://i.pravatar.cc/150?img=9',
      },
      {
        id: '5',
        type: 'receive',
        amount: 300.0,
        date: new Date(now - oneDay * 2),
        sender: 'Luc Dubois',
        avatarUrl: 'https://i.pravatar.cc/150?img=68',
      },
      {
        id: '6',
        type: 'send',
        amount: 450.0,
        date: new Date(now - oneDay * 3),
        recipient: 'Claire Moreau',
        avatarUrl: 'https://i.pravatar.cc/150?img=10',
      },
      {
        id: '7',
        type: 'receive',
        amount: 180.75,
        date: new Date(now - oneDay * 4),
        sender: 'Marc Petit',
        avatarUrl: 'https://i.pravatar.cc/150?img=13',
      },
      {
        id: '8',
        type: 'send',
        amount: 95.0,
        date: new Date(now - oneDay * 5),
        recipient: 'Emma Leroy',
        avatarUrl: 'https://i.pravatar.cc/150?img=24',
      },
    ];
  }, []);

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
      <header className="bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Historique</h1>
        </div>
      </header>

      {/* Summary Stats */}
      <div className="px-6 py-6">
        <div className="bg-gradient-to-br from-[#FF9500] via-[#FF8C00] to-[#E07B00] rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span className="text-sm opacity-90">Ce mois-ci</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm opacity-80 mb-1">Reçu</p>
              <p className="text-2xl font-bold">
                +
                {transactions
                  .filter((t) => t.type === 'receive')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toFixed(2)}{' '}
                ₱
              </p>
            </div>
            <div>
              <p className="text-sm opacity-80 mb-1">Envoyé</p>
              <p className="text-2xl font-bold">
                -
                {transactions
                  .filter((t) => t.type === 'send')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toFixed(2)}{' '}
                ₱
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List by Date */}
      <div className="px-6 space-y-6 pb-4">
        {Object.entries(groupedTransactions).map(([date, dateTransactions]) => (
          <div key={date}>
            <h2 className="text-sm font-bold text-gray-600 mb-3 px-2">{date}</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4">
              {dateTransactions.map((transaction) => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export default History;
