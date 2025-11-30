import { useMemo, useEffect } from 'react';
import { router } from '@inertiajs/react';
import BalanceCard from '../components/BalanceCard';
import TransactionItem from '../components/TransactionItem';
import BottomNav from '../components/BottomNav';
import DefaultAvatar from '../components/DefaultAvatar';
import type { Transaction } from '../types';
import { getPrivateKeyLocally, storePrivateKeyLocally } from '../lib/crypto';

/**
 * Props de la page Home
 */
interface HomeProps {
  /** Solde actuel du compte */
  balance: number;
  /** Liste des transactions récentes (5 dernières) */
  transactions: Array<{
    id: number;
    type: 'send' | 'receive';
    amount: number;
    date: string;
    sender?: string;
    recipient?: string;
    avatarUrl?: string;
  }>;
  /** Informations de l'utilisateur connecté */
  user: {
    name: string;
    email: string;
    profile_picture?: string | null;
  };
  /** Informations du compte (optionnel) */
  account?: {
    account_number: string;
  };
}

/**
 * Page d'accueil (Dashboard)
 * 
 * Cette page affiche :
 * - Le profil de l'utilisateur avec salutation personnalisée selon l'heure
 * - Le solde actuel du compte
 * - Les 5 dernières transactions (envoyées et reçues)
 * - La navigation vers les autres pages (envoi, historique, profil, etc.)
 * 
 * La page gère également la migration automatique des clés privées depuis
 * l'ancien format (basé sur l'email) vers le nouveau format (basé sur le numéro de compte).
 * 
 * @param props Les props de la page
 * @returns Le composant React de la page d'accueil
 */
function Home({ balance = 0, transactions: serverTransactions = [], user, account }: HomeProps) {
  /**
   * Transforme les transactions du serveur en format Transaction pour l'affichage
   * 
   * Convertit les IDs en chaînes et les dates en objets Date pour correspondre
   * au type Transaction utilisé par les composants.
   */
  const transactions = useMemo<Transaction[]>(() => {
    return serverTransactions.map((t) => ({
      ...t,
      id: String(t.id),
      date: new Date(t.date),
    }));
  }, [serverTransactions]);

  /**
   * Migre la clé privée au chargement de la page si nécessaire
   * 
   * Cette fonction gère la migration automatique des clés privées depuis
   * l'ancien format (stocké avec l'email comme clé) vers le nouveau format
   * (stocké avec le numéro de compte comme clé).
   * 
   * Processus :
   * 1. Vérifier si une clé existe déjà avec le numéro de compte (déjà migrée)
   * 2. Si non, chercher une clé temporaire stockée avec l'email
   * 3. Si trouvée, migrer vers le numéro de compte
   * 4. Nettoyer les anciennes clés temporaires
   */
  useEffect(() => {
    const migratePrivateKey = async () => {
      if (!account?.account_number || !user.email) return;
      
      try {
        // Vérifier si une clé existe déjà avec le numéro de compte
        const existingKey = await getPrivateKeyLocally(account.account_number);
        if (existingKey) return; // Déjà migrée
        
        // Chercher une clé temporaire et la migrer
        const tempKey = typeof window !== 'undefined'
          ? localStorage.getItem(`private_key_temp_unencrypted_${user.email}`)
          : null;
        
        if (tempKey) {
          // Migrer vers le numéro de compte
          await storePrivateKeyLocally(account.account_number, tempKey);
          // Nettoyer les anciennes clés temporaires
          if (typeof window !== 'undefined') {
            localStorage.removeItem(`private_key_temp_unencrypted_${user.email}`);
            localStorage.removeItem(`private_key_temp_${user.email}`);
          }
          console.log('Clé privée migrée avec succès au chargement du tableau de bord');
        }
      } catch (error) {
        console.error('Échec de la migration de la clé privée sur le tableau de bord:', error);
      }
    };
    
    migratePrivateKey();
  }, [account?.account_number, user.email]);

  /**
   * Gère la navigation vers la page d'historique
   */
  const handleHistory = () => {
    router.visit('/history');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-gray-50 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {user?.profile_picture ? (
              <img
                src={user.profile_picture}
                alt="Profil utilisateur"
                className="w-16 h-16 rounded-full object-cover ring-4 ring-[#FF8C00]"
              />
            ) : (
              <div className="ring-4 ring-[#FF8C00] rounded-full">
                <DefaultAvatar name={user?.name || 'Utilisateur'} size={64} />
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500 font-medium">
                {(() => {
                  const hour = new Date().getHours();
                  if (hour >= 5 && hour < 12) {
                    return `Bonjour ${user?.name || 'Utilisateur'},`;
                  } else if (hour >= 12 && hour < 18) {
                    return `Bon après-midi ${user?.name || 'Utilisateur'},`;
                  } else {
                    return `Bonsoir ${user?.name || 'Utilisateur'},`;
                  }
                })()}
              </p>
              <h1 className="text-xl font-bold text-gray-800">Bienvenue !</h1>
            </div>
          </div>
          <button 
            onClick={() => router.visit('/notifications')}
            className="w-14 h-14 bg-white hover:bg-gray-50 rounded-2xl flex items-center justify-center transition-colors relative"
          >
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
          <button
            onClick={handleHistory}
            className="text-sm text-[#FF8C00] font-semibold hover:text-[#FF8C00]"
          >
            Voir tout
          </button>
        </div>
        {transactions.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-500">
            Aucune transaction
          </div>
        ) : (
          <div className="bg-white rounded-2xl px-4">
            {transactions.map((transaction) => (
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

export default Home;
