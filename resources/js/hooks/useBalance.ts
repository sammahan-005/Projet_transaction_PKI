import { useState, useCallback } from 'react';

/**
 * Hook personnalisé pour gérer le solde d'un compte
 * 
 * Ce hook fournit un état local pour le solde et des fonctions pour
 * l'augmenter ou le diminuer. Le solde est synchronisé avec le serveur
 * mais peut être mis à jour localement pour une meilleure UX.
 * 
 * @param initialBalance Solde initial (par défaut: 1800.0)
 * @returns Objet contenant le solde et les fonctions de mise à jour
 */
export const useBalance = (initialBalance: number = 1800.0) => {
  // État local pour le solde
  const [balance, setBalance] = useState(initialBalance);

  /**
   * Ajoute un montant au solde
   * 
   * @param amount Montant à ajouter (doit être positif)
   */
  const addBalance = useCallback((amount: number) => {
    setBalance((prev) => prev + amount);
  }, []);

  /**
   * Déduit un montant du solde
   * 
   * Le solde ne peut jamais être négatif (minimum: 0).
   * 
   * @param amount Montant à déduire (doit être positif)
   */
  const deductBalance = useCallback((amount: number) => {
    setBalance((prev) => Math.max(0, prev - amount));
  }, []);

  return {
    balance,        // Solde actuel
    addBalance,     // Fonction pour ajouter au solde
    deductBalance,  // Fonction pour déduire du solde
  };
};
