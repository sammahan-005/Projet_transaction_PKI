import { memo } from 'react';
import type { Transaction } from '../types';

/**
 * Props du composant TransactionItem
 */
interface TransactionItemProps {
  /** La transaction à afficher */
  transaction: Transaction;
}

/**
 * Composant TransactionItem
 * 
 * Affiche un élément de transaction dans une liste. Le composant montre :
 * - L'avatar ou les initiales de l'autre partie (expéditeur ou destinataire)
 * - Le nom de l'autre partie
 * - Le type de transaction (Reçu/Envoyé) et la date
 * - Le montant avec le signe approprié (+ pour reçu, - pour envoyé)
 * 
 * Le composant est mémorisé avec memo() pour éviter les re-rendus inutiles.
 * 
 * @param props Les props du composant
 * @returns Le composant React
 */
const TransactionItem = memo(({ transaction }: TransactionItemProps) => {
  // Déterminer si c'est une transaction de réception ou d'envoi
  const isReceive = transaction.type === 'receive';
  
  // Afficher le nom de l'autre partie (expéditeur si reçu, destinataire si envoyé)
  const displayName = isReceive ? transaction.sender : transaction.recipient;

  /**
   * Formate la date de la transaction de manière lisible
   * 
   * Affiche :
   * - "Aujourd'hui" si la transaction est d'aujourd'hui
   * - "Hier" si la transaction est d'hier
   * - La date formatée en français sinon (ex: "15 déc.")
   * 
   * @param date La date à formater
   * @returns La date formatée en français
   */
  const formatDate = (date: Date) => {
    const today = new Date();
    const transactionDate = new Date(date);

    // Vérifier si c'est aujourd'hui
    if (transactionDate.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    }

    // Vérifier si c'est hier
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (transactionDate.toDateString() === yesterday.toDateString()) {
      return "Hier";
    }

    // Formater la date en français (jour mois)
    return transactionDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });
  };

  /**
   * Extrait les initiales d'un nom
   * 
   * Pour un nom complet (ex: "Jean Dupont"), retourne "JD".
   * Pour un nom simple (ex: "Jean"), retourne "J".
   * Si le nom est vide, retourne "?".
   * 
   * @param name Le nom dont extraire les initiales
   * @returns Les initiales en majuscules
   */
  const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    const names = name.split(' ');
    return names.length > 1
      ? `${names[0][0]}${names[1][0]}`.toUpperCase()
      : names[0][0].toUpperCase();
  };

  return (
    <div className="flex items-center justify-between py-4">
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
