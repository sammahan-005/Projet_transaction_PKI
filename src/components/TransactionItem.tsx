import { memo } from 'react';
import type { Transaction } from '../types';

interface TransactionItemProps {
  transaction: Transaction;
}

const TransactionItem = memo(({ transaction }: TransactionItemProps) => {
  const isReceive = transaction.type === 'receive';
  const displayName = isReceive ? transaction.sender : transaction.recipient;

  const formatDate = (date: Date) => {
    const today = new Date();
    const transactionDate = new Date(date);

    if (transactionDate.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (transactionDate.toDateString() === yesterday.toDateString()) {
      return "Hier";
    }

    return transactionDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    const names = name.split(' ');
    return names.length > 1
      ? `${names[0][0]}${names[1][0]}`.toUpperCase()
      : names[0][0].toUpperCase();
  };

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-3">
        {transaction.avatarUrl ? (
          <img
            src={transaction.avatarUrl}
            alt={displayName}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white ${
              isReceive
                ? 'bg-[#88ff00]'
                : 'bg-[#88ff00]'
            }`}
          >
            {getInitials(displayName)}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-gray-800">{displayName}</p>
          <p className="text-xs text-gray-500">
            {isReceive ? 'Reçu' : 'Envoyé'} • {formatDate(transaction.date)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={`text-sm font-bold ${
            isReceive ? 'text-[#73ff00c5]' : 'text-gray-800'
          }`}
        >
          {isReceive ? '+' : '-'}{transaction.amount.toFixed(2)} ₱
        </p>
      </div>
    </div>
  );
});

TransactionItem.displayName = 'TransactionItem';

export default TransactionItem;
