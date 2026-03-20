import { useCallback, useState } from 'react';

import { addTransaction, deleteTransaction, getTransactions, updateTransaction } from '@/lib/transactions';
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

  const update = useCallback(async (id: string, payload: Partial<Transaction>) => {
    const updated = await updateTransaction(id, payload);
    if (!updated) return null;
    setTransactions((prev) => prev.map((tx) => (tx.id === id ? { ...tx, ...updated } : tx)));
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteTransaction(id);
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  }, []);

  return {
    transactions,
    loading,
    refresh,
    add,
    update,
    remove,
  };
}
