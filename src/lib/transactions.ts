import { apiRequest } from '@/lib/api';
import { getCachedAuthState, invalidateSession, loadAuthState } from '@/lib/auth';
import { getCachedAppSettings } from '@/lib/app-settings';
import { getActiveDataScope, scopedKey, withDuoQuery } from '@/lib/data-scope';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { Transaction, TransactionSystem } from '@/lib/types';
import { applyTransactionMeta, removeTransactionMeta, setTransactionMeta, TransactionMeta } from '@/lib/transaction-meta';

type TransactionsListener = () => void;
const transactionsListeners = new Set<TransactionsListener>();

async function getPendingCreates(scope: Awaited<ReturnType<typeof getActiveDataScope>>): Promise<Transaction[]> {
  return getItem<Transaction[]>(scopedKey(STORAGE_KEYS.transactionsPendingCreates, scope), []);
}

async function setPendingCreates(
  scope: Awaited<ReturnType<typeof getActiveDataScope>>,
  items: Transaction[]
) {
  await setItem<Transaction[]>(scopedKey(STORAGE_KEYS.transactionsPendingCreates, scope), items);
}

async function getPendingDeletes(scope: Awaited<ReturnType<typeof getActiveDataScope>>): Promise<string[]> {
  return getItem<string[]>(scopedKey(STORAGE_KEYS.transactionsPendingDeletes, scope), []);
}

async function setPendingDeletes(
  scope: Awaited<ReturnType<typeof getActiveDataScope>>,
  items: string[]
) {
  await setItem<string[]>(scopedKey(STORAGE_KEYS.transactionsPendingDeletes, scope), items);
}

async function syncPending(
  token: string,
  current: Transaction[],
  scope: Awaited<ReturnType<typeof getActiveDataScope>>
): Promise<Transaction[]> {
  let next = current;

  const pendingDeletes = await getPendingDeletes(scope);
  if (pendingDeletes.length > 0) {
    const remainingDeletes: string[] = [];
    for (const id of pendingDeletes) {
      try {
        await apiRequest(withDuoQuery(`/transactions/${id}`, scope), { method: 'DELETE', token });
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('Movimiento no encontrado')) {
          continue;
        }
        remainingDeletes.push(id);
      }
    }
    await setPendingDeletes(scope, remainingDeletes);
    next = next.filter((tx) => !pendingDeletes.includes(tx.id));
  }

  const pendingCreates = await getPendingCreates(scope);
  if (pendingCreates.length > 0) {
    const remainingCreates: Transaction[] = [];
    for (const item of pendingCreates) {
      try {
        const created = await apiRequest<Transaction>(withDuoQuery('/transactions', scope), {
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
    await setPendingCreates(scope, remainingCreates);
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
  const scope = await getActiveDataScope();
  const storageKey = scopedKey(STORAGE_KEYS.transactions, scope);
  const token = await getAuthToken();
  if (!token) {
    const items = await getItem<Transaction[]>(storageKey, []);
    const merged = await applyTransactionMeta(items);
    return normalizeTransactions(merged);
  }

  try {
    let items = await apiRequest<Transaction[]>(withDuoQuery('/transactions', scope), {
      method: 'GET',
      token,
    });

    const pendingDeletes = await getPendingDeletes(scope);
    if (pendingDeletes.length > 0) {
      items = items.filter((tx) => !pendingDeletes.includes(tx.id));
    }
    const pendingCreates = await getPendingCreates(scope);
    if (pendingCreates.length > 0) {
      const existingIds = new Set(items.map((tx) => tx.id));
      const mergedLocal = pendingCreates.filter((tx) => !existingIds.has(tx.id));
      items = [...mergedLocal, ...items];
    }

    items = await syncPending(token, items, scope);
    await setItem<Transaction[]>(storageKey, items);
    const merged = await applyTransactionMeta(items);
    return normalizeTransactions(merged);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Token inválido') || message.includes('Token requerido')) {
      await invalidateSession();
    }
    const items = await getItem<Transaction[]>(storageKey, []);
    const merged = await applyTransactionMeta(items);
    return normalizeTransactions(merged);
  }
}

export async function addTransaction(item: Transaction, meta?: TransactionMeta): Promise<Transaction[]> {
  const scope = await getActiveDataScope();
  const storageKey = scopedKey(STORAGE_KEYS.transactions, scope);
  const token = await getAuthToken();
  if (!token) {
    const items = await getTransactions();
    const next = [item, ...items];
    await setItem<Transaction[]>(storageKey, next);
    if (meta) {
      await setTransactionMeta(item.id, meta);
    }
    notifyTransactionsChanged();
    return normalizeTransactions(next);
  }

  try {
    const created = await apiRequest<Transaction>(withDuoQuery('/transactions', scope), {
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
    const cached = await getItem<Transaction[]>(storageKey, []);
    const next = [created, ...cached];
    await setItem<Transaction[]>(storageKey, next);
    const merged = await applyTransactionMeta(next);
    notifyTransactionsChanged();
    return normalizeTransactions(merged);
  } catch {
    const cached = await getItem<Transaction[]>(storageKey, []);
    const next = [item, ...cached];
    await setItem<Transaction[]>(storageKey, next);
    const pending = await getPendingCreates(scope);
    await setPendingCreates(scope, [item, ...pending]);
    if (meta) {
      await setTransactionMeta(item.id, meta);
    }
    const merged = await applyTransactionMeta(next);
    notifyTransactionsChanged();
    return normalizeTransactions(merged);
  }
}

export async function updateTransaction(id: string, payload: Partial<Transaction>): Promise<Transaction | null> {
  const scope = await getActiveDataScope();
  const storageKey = scopedKey(STORAGE_KEYS.transactions, scope);
  const token = await getAuthToken();
  const { meta, body } = splitMeta(payload);
  if (!token) {
    const items = await getItem<Transaction[]>(storageKey, []);
    const next = items.map((tx) => (tx.id === id ? { ...tx, ...payload } : tx));
    await setItem<Transaction[]>(storageKey, next);
    if (meta.weekly !== undefined || meta.system !== undefined) {
      await setTransactionMeta(id, meta);
    }
    notifyTransactionsChanged();
    return next.find((tx) => tx.id === id) ?? null;
  }

  const updated = await apiRequest<Transaction>(withDuoQuery(`/transactions/${id}`, scope), {
    method: 'PUT',
    token,
    body,
  });
  if (meta.weekly !== undefined || meta.system !== undefined) {
    await setTransactionMeta(id, meta);
  }
  const items = await getItem<Transaction[]>(storageKey, []);
  const next = items.map((tx) => (tx.id === id ? { ...tx, ...updated } : tx));
  await setItem<Transaction[]>(storageKey, next);
  const merged = await applyTransactionMeta([updated]);
  notifyTransactionsChanged();
  return merged[0] ?? updated;
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const scope = await getActiveDataScope();
  const storageKey = scopedKey(STORAGE_KEYS.transactions, scope);
  const token = await getAuthToken();
  if (!token) {
    const items = await getItem<Transaction[]>(storageKey, []);
    const next = items.filter((tx) => tx.id !== id);
    await setItem<Transaction[]>(storageKey, next);
    await removeTransactionMeta(id);
    notifyTransactionsChanged();
    return true;
  }

  try {
    await apiRequest(withDuoQuery(`/transactions/${id}`, scope), {
      method: 'DELETE',
      token,
    });
    const items = await getItem<Transaction[]>(storageKey, []);
    const next = items.filter((tx) => tx.id !== id);
    await setItem<Transaction[]>(storageKey, next);
    await removeTransactionMeta(id);
    notifyTransactionsChanged();
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Movimiento no encontrado') || message.includes('No pudimos conectar')) {
      const items = await getItem<Transaction[]>(storageKey, []);
      const next = items.filter((tx) => tx.id !== id);
      await setItem<Transaction[]>(storageKey, next);
      await removeTransactionMeta(id);
      if (message.includes('No pudimos conectar')) {
        const pendingDeletes = await getPendingDeletes(scope);
        if (!pendingDeletes.includes(id)) {
          await setPendingDeletes(scope, [id, ...pendingDeletes]);
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
  const scope = await getActiveDataScope();
  const storageKey = scopedKey(STORAGE_KEYS.transactions, scope);
  const items = await getTransactions();
  const next = items.map((tx) => (tx.category === previous ? { ...tx, category: nextName } : tx));
  await setItem<Transaction[]>(storageKey, next);
  return normalizeTransactions(next);
}

export async function updateTransactionMethod(previous: string, nextName: string): Promise<Transaction[]> {
  const scope = await getActiveDataScope();
  const storageKey = scopedKey(STORAGE_KEYS.transactions, scope);
  const items = await getTransactions();
  const next = items.map((tx) => (tx.method === previous ? { ...tx, method: nextName } : tx));
  await setItem<Transaction[]>(storageKey, next);
  return normalizeTransactions(next);
}
