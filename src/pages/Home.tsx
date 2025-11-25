import { useMemo } from 'react';
import BalanceCard from '../components/BalanceCard';
import TransactionItem from '../components/TransactionItem';
import BottomNav from '../components/BottomNav';
import { useBalance } from '../hooks/useBalance';
import type { Transaction } from '../types';

// Mock transactions data
const getMockTransactions = (): Transaction[] => {
  const now = Date.now();
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
      date: new Date(now - 86400000),
      recipient: 'Marie Martin',
      avatarUrl: 'https://i.pravatar.cc/150?img=5',
    },
    {
      id: '3',
      type: 'receive',
      amount: 500.0,
      date: new Date(now - 86400000),
      sender: 'Pierre Bernard',
      avatarUrl: 'https://i.pravatar.cc/150?img=33',
    },
    {
      id: '4',
      type: 'send',
      amount: 75.25,
      date: new Date(now - 172800000),
      recipient: 'Sophie Laurent',
      avatarUrl: 'https://i.pravatar.cc/150?img=9',
    },
    {
      id: '5',
      type: 'receive',
      amount: 300.0,
      date: new Date(now - 172800000),
      sender: 'Luc Dubois',
      avatarUrl: 'https://i.pravatar.cc/150?img=68',
    },
  ];
};

function Home() {
  const { balance } = useBalance(1800.0);

  const transactions = useMemo<Transaction[]>(() => getMockTransactions(), []);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-gray-50 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="https://i.pravatar.cc/150?img=15"
              alt="User profile"
              className="w-16 h-16 rounded-full object-cover ring-4 ring-[#FF8C00]"
            />
            <div>
              <p className="text-sm text-gray-500 font-medium">Hello Alexer,</p>
              <h1 className="text-xl font-bold text-gray-800">Welcome Back!</h1>
            </div>
          </div>
          <button className="w-14 h-14 bg-white hover:bg-gray-50 rounded-2xl flex items-center justify-center transition-colors border border-gray-200 shadow-sm">
            <svg className="w-6 h-6 text-[#FF8C00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
        </div>
      </header>

      {/* Balance Card */}
      <div className="px-4 pt-6 pb-12">
        <BalanceCard balance={balance} />
      </div>

      {/* Transactions History Section */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Transactions</h2>
          <button className="text-sm text-[#FF8C00] font-semibold hover:text-[#FF8C00]">
            Voir tout
          </button>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4">
          {transactions.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export default Home;
