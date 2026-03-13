import { useCallback, useState } from 'react';

import { addTransaction, getTransactions } from '@/lib/transactions';
import { Transaction } from '@/lib/types';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const items = await getTransactions();
    setTransactions(items);
    setLoading(false);
  }, []);

  const add = useCallback(async (item: Transaction) => {
    const items = await addTransaction(item);
    setTransactions(items);
  }, []);

  return {
    transactions,
    loading,
    refresh,
    add,
  };
}
