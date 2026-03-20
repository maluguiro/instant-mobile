import { apiRequest } from '@/lib/api';
import { getCachedAuthState, loadAuthState } from '@/lib/auth';
import { getCachedAppSettings } from '@/lib/app-settings';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { Transaction } from '@/lib/types';

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

export async function getTransactions(): Promise<Transaction[]> {
  const token = await getAuthToken();
  if (!token) {
    const items = await getItem<Transaction[]>(STORAGE_KEYS.transactions, []);
    return normalizeTransactions(items);
  }

  try {
    const items = await apiRequest<Transaction[]>('/transactions', {
      method: 'GET',
      token,
    });

    await setItem<Transaction[]>(STORAGE_KEYS.transactions, items);
    return normalizeTransactions(items);
  } catch {
    const items = await getItem<Transaction[]>(STORAGE_KEYS.transactions, []);
    return normalizeTransactions(items);
  }
}

export async function addTransaction(item: Transaction): Promise<Transaction[]> {
  const token = await getAuthToken();
  if (!token) {
    const items = await getTransactions();
    const next = [item, ...items];
    await setItem<Transaction[]>(STORAGE_KEYS.transactions, next);
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
      },
    });

    const cached = await getItem<Transaction[]>(STORAGE_KEYS.transactions, []);
    const next = [created, ...cached];
    await setItem<Transaction[]>(STORAGE_KEYS.transactions, next);
    return normalizeTransactions(next);
  } catch {
    const cached = await getItem<Transaction[]>(STORAGE_KEYS.transactions, []);
    const next = [item, ...cached];
    await setItem<Transaction[]>(STORAGE_KEYS.transactions, next);
    return normalizeTransactions(next);
  }
}

export async function updateTransaction(id: string, payload: Partial<Transaction>): Promise<Transaction | null> {
  const token = await getAuthToken();
  if (!token) {
    const items = await getItem<Transaction[]>(STORAGE_KEYS.transactions, []);
    const next = items.map((tx) => (tx.id === id ? { ...tx, ...payload } : tx));
    await setItem<Transaction[]>(STORAGE_KEYS.transactions, next);
    return next.find((tx) => tx.id === id) ?? null;
  }

  const updated = await apiRequest<Transaction>(`/transactions/${id}`, {
    method: 'PUT',
    token,
    body: payload,
  });
  const items = await getItem<Transaction[]>(STORAGE_KEYS.transactions, []);
  const next = items.map((tx) => (tx.id === id ? { ...tx, ...updated } : tx));
  await setItem<Transaction[]>(STORAGE_KEYS.transactions, next);
  return updated;
}

export async function deleteTransaction(id: string): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    const items = await getItem<Transaction[]>(STORAGE_KEYS.transactions, []);
    const next = items.filter((tx) => tx.id !== id);
    await setItem<Transaction[]>(STORAGE_KEYS.transactions, next);
    return;
  }

  try {
    await apiRequest(`/transactions/${id}`, {
      method: 'DELETE',
      token,
    });
    const items = await getItem<Transaction[]>(STORAGE_KEYS.transactions, []);
    const next = items.filter((tx) => tx.id !== id);
    await setItem<Transaction[]>(STORAGE_KEYS.transactions, next);
  } catch {
    return;
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
