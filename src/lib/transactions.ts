import { apiRequest } from '@/lib/api';
import { getCachedAuthState, invalidateSession, loadAuthState } from '@/lib/auth';
import { getCachedAppSettings } from '@/lib/app-settings';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { Transaction, TransactionSystem } from '@/lib/types';
import { applyTransactionMeta, removeTransactionMeta, setTransactionMeta, TransactionMeta } from '@/lib/transaction-meta';

type TransactionsListener = () => void;
const transactionsListeners = new Set<TransactionsListener>();

async function getPendingCreates(): Promise<Transaction[]> {
  return getItem<Transaction[]>(STORAGE_KEYS.transactionsPendingCreates, []);
}

async function setPendingCreates(items: Transaction[]) {
  await setItem<Transaction[]>(STORAGE_KEYS.transactionsPendingCreates, items);
}

async function getPendingDeletes(): Promise<string[]> {
  return getItem<string[]>(STORAGE_KEYS.transactionsPendingDeletes, []);
}

async function setPendingDeletes(items: string[]) {
  await setItem<string[]>(STORAGE_KEYS.transactionsPendingDeletes, items);
}

async function syncPending(token: string, current: Transaction[]): Promise<Transaction[]> {
  let next = current;

  const pendingDeletes = await getPendingDeletes();
  if (pendingDeletes.length > 0) {
    const remainingDeletes: string[] = [];
    for (const id of pendingDeletes) {
      try {
        await apiRequest(`/transactions/${id}`, { method: 'DELETE', token });
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('Movimiento no encontrado')) {
          continue;
        }
        remainingDeletes.push(id);
      }
    }
    await setPendingDeletes(remainingDeletes);
    next = next.filter((tx) => !pendingDeletes.includes(tx.id));
  }

  const pendingCreates = await getPendingCreates();
  if (pendingCreates.length > 0) {
    const remainingCreates: Transaction[] = [];
    for (const item of pendingCreates) {
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
        next = [created, ...next.filter((tx) => tx.id !== item.id)];
      } catch {
        remainingCreates.push(item);
      }
    }
    await setPendingCreates(remainingCreates);
  }

  return next;
}

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
    let items = await apiRequest<Transaction[]>('/transactions', {
      method: 'GET',
      token,
    });

    const pendingDeletes = await getPendingDeletes();
    if (pendingDeletes.length > 0) {
      items = items.filter((tx) => !pendingDeletes.includes(tx.id));
    }
    const pendingCreates = await getPendingCreates();
    if (pendingCreates.length > 0) {
      const existingIds = new Set(items.map((tx) => tx.id));
      const mergedLocal = pendingCreates.filter((tx) => !existingIds.has(tx.id));
      items = [...mergedLocal, ...items];
    }

    items = await syncPending(token, items);
    await setItem<Transaction[]>(STORAGE_KEYS.transactions, items);
    const merged = await applyTransactionMeta(items);
    return normalizeTransactions(merged);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Token inválido') || message.includes('Token requerido')) {
      await invalidateSession();
    }
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
    const pending = await getPendingCreates();
    await setPendingCreates([item, ...pending]);
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
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Movimiento no encontrado') || message.includes('No pudimos conectar')) {
      const items = await getItem<Transaction[]>(STORAGE_KEYS.transactions, []);
      const next = items.filter((tx) => tx.id !== id);
      await setItem<Transaction[]>(STORAGE_KEYS.transactions, next);
      await removeTransactionMeta(id);
      if (message.includes('No pudimos conectar')) {
        const pendingDeletes = await getPendingDeletes();
        if (!pendingDeletes.includes(id)) {
          await setPendingDeletes([id, ...pendingDeletes]);
        }
      }
      notifyTransactionsChanged();
      return true;
    }
    if (message.includes('Token inválido') || message.includes('Token requerido')) {
      await invalidateSession();
    }
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
