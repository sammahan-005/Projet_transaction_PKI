import { useState, useCallback } from 'react';

export const useBalance = (initialBalance: number = 1800.0) => {
  const [balance, setBalance] = useState(initialBalance);

  const addBalance = useCallback((amount: number) => {
    setBalance((prev) => prev + amount);
  }, []);

  const deductBalance = useCallback((amount: number) => {
    setBalance((prev) => Math.max(0, prev - amount));
  }, []);

  return {
    balance,
    addBalance,
    deductBalance,
  };
};
