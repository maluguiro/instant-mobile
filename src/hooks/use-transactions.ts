import { useCallback, useEffect, useState } from 'react';

import {
  addTransaction,
  deleteTransaction,
  getTransactions,
  subscribeTransactionsChanged,
  updateTransaction,
} from '@/lib/transactions';
import { Transaction } from '@/lib/types';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    console.log('[transactions][refresh][start]');
    try {
      const items = await getTransactions();
      setTransactions(items);
      console.log('[transactions][refresh][ok]', { count: items.length });
    } catch {
      console.log('[transactions][refresh][error]');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeTransactionsChanged(() => {
      refresh();
    });
    return unsubscribe;
  }, [refresh]);

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
    console.log('[transactions][remove][start]', { id, count: transactions.length });
    const ok = await deleteTransaction(id);
    console.log('[transactions][remove][afterDelete]', { id, ok });
    if (!ok) return false;
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    console.log('[transactions][remove][stateUpdated]', { id });
    return true;
  }, [transactions.length]);

  return {
    transactions,
    loading,
    refresh,
    add,
    update,
    remove,
  };
}
