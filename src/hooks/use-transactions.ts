import { useCallback, useState } from 'react';

import { addTransaction, getTransactions } from '@/lib/transactions';
import { Transaction } from '@/lib/types';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const items = await getTransactions();
      setTransactions(items);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const add = useCallback(async (item: Transaction) => {
    try {
      const items = await addTransaction(item);
      setTransactions(items);
    } catch {
      return;
    }
  }, []);

  return {
    transactions,
    loading,
    refresh,
    add,
  };
}
