import { apiRequest } from '@/lib/api';
import { getCachedAuthState, loadAuthState } from '@/lib/auth';
import { getCachedAppSettings } from '@/lib/app-settings';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { Transaction, TransactionSystem } from '@/lib/types';
import { applyTransactionMeta, removeTransactionMeta, setTransactionMeta, TransactionMeta } from '@/lib/transaction-meta';

type TransactionsListener = () => void;
const transactionsListeners = new Set<TransactionsListener>();

function notifyTransactionsChanged() {
  transactionsListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeTransactionsChanged(listener: TransactionsListener) {
  transactionsListeners.add(listener);
  return () => {
    transactionsListeners.delete(listener);
  };
}

async function getAuthToken() {
  const cached = getCachedAuthState();
  if (cached.token) return cached.token;
  const loaded = await loadAuthState();
  return loaded.token;
}

function normalizeTransactions(items: Transaction[]) {
  const defaultCurrency = getCachedAppSettings().currency ?? 'ARS';
  return items
    .map((item) => ({
      currency: item.currency ?? defaultCurrency,
      ...item,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function splitMeta(payload: Partial<Transaction>) {
  const { system, ...rest } = payload;
  const meta: TransactionMeta = {};
  if (system !== undefined) meta.system = system as TransactionSystem;
  return { meta, body: rest };
}

export async function getTransactions(): Promise<Transaction[]> {
  const token = await getAuthToken();
  if (!token) {
    const items = await getItem<Transaction[]>(STORAGE_KEYS.transactions, []);
    const merged = await applyTransactionMeta(items);
    return normalizeTransactions(merged);
  }

  try {
    const items = await apiRequest<Transaction[]>('/transactions', {
      method: 'GET',
      token,
    });

    await setItem<Transaction[]>(STORAGE_KEYS.transactions, items);
    const merged = await applyTransactionMeta(items);
    return normalizeTransactions(merged);
  } catch {
    const items = await getItem<Transaction[]>(STORAGE_KEYS.transactions, []);
    const merged = await applyTransactionMeta(items);
    return normalizeTransactions(merged);
  }
}

export async function addTransaction(item: Transaction, meta?: TransactionMeta): Promise<Transaction[]> {
  const token = await getAuthToken();
  if (!token) {
    const items = await getTransactions();
    const next = [item, ...items];
    await setItem<Transaction[]>(STORAGE_KEYS.transactions, next);
    if (meta) {
      await setTransactionMeta(item.id, meta);
    }
    notifyTransactionsChanged();
    return normalizeTransactions(next);
  }

  try {
    const created = await apiRequest<Transaction>('/transactions', {
      method: 'POST',
      token,
      body: {
        type: item.type,
        amount: item.amount,
        currency: item.currency,
        category: item.category,
        date: item.date,
        method: item.method,
        note: item.note ?? '',
        weekly: item.weekly ?? false,
      },
    });

    if (meta) {
      await setTransactionMeta(created.id, meta);
    }
    const cached = await getItem<Transaction[]>(STORAGE_KEYS.transactions, []);
    const next = [created, ...cached];
    await setItem<Transaction[]>(STORAGE_KEYS.transactions, next);
    const merged = await applyTransactionMeta(next);
    notifyTransactionsChanged();
    return normalizeTransactions(merged);
  } catch {
    const cached = await getItem<Transaction[]>(STORAGE_KEYS.transactions, []);
    const next = [item, ...cached];
    await setItem<Transaction[]>(STORAGE_KEYS.transactions, next);
    if (meta) {
      await setTransactionMeta(item.id, meta);
    }
    const merged = await applyTransactionMeta(next);
    notifyTransactionsChanged();
    return normalizeTransactions(merged);
  }
}

export async function updateTransaction(id: string, payload: Partial<Transaction>): Promise<Transaction | null> {
  const token = await getAuthToken();
  const { meta, body } = splitMeta(payload);
  if (!token) {
    const items = await getItem<Transaction[]>(STORAGE_KEYS.transactions, []);
    const next = items.map((tx) => (tx.id === id ? { ...tx, ...payload } : tx));
    await setItem<Transaction[]>(STORAGE_KEYS.transactions, next);
    if (meta.weekly !== undefined || meta.system !== undefined) {
      await setTransactionMeta(id, meta);
    }
    notifyTransactionsChanged();
    return next.find((tx) => tx.id === id) ?? null;
  }

  const updated = await apiRequest<Transaction>(`/transactions/${id}`, {
    method: 'PUT',
    token,
    body,
  });
  if (meta.weekly !== undefined || meta.system !== undefined) {
    await setTransactionMeta(id, meta);
  }
  const items = await getItem<Transaction[]>(STORAGE_KEYS.transactions, []);
  const next = items.map((tx) => (tx.id === id ? { ...tx, ...updated } : tx));
  await setItem<Transaction[]>(STORAGE_KEYS.transactions, next);
  const merged = await applyTransactionMeta([updated]);
  notifyTransactionsChanged();
  return merged[0] ?? updated;
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const token = await getAuthToken();
  if (!token) {
    const items = await getItem<Transaction[]>(STORAGE_KEYS.transactions, []);
    const next = items.filter((tx) => tx.id !== id);
    await setItem<Transaction[]>(STORAGE_KEYS.transactions, next);
    await removeTransactionMeta(id);
    notifyTransactionsChanged();
    return true;
  }

  try {
    await apiRequest(`/transactions/${id}`, {
      method: 'DELETE',
      token,
    });
    const items = await getItem<Transaction[]>(STORAGE_KEYS.transactions, []);
    const next = items.filter((tx) => tx.id !== id);
    await setItem<Transaction[]>(STORAGE_KEYS.transactions, next);
    await removeTransactionMeta(id);
    notifyTransactionsChanged();
    return true;
  } catch {
    return false;
  }
}

export async function updateTransactionCategory(previous: string, nextName: string): Promise<Transaction[]> {
  const items = await getTransactions();
  const next = items.map((tx) => (tx.category === previous ? { ...tx, category: nextName } : tx));
  await setItem<Transaction[]>(STORAGE_KEYS.transactions, next);
  return normalizeTransactions(next);
}

export async function updateTransactionMethod(previous: string, nextName: string): Promise<Transaction[]> {
  const items = await getTransactions();
  const next = items.map((tx) => (tx.method === previous ? { ...tx, method: nextName } : tx));
  await setItem<Transaction[]>(STORAGE_KEYS.transactions, next);
  return normalizeTransactions(next);
}
