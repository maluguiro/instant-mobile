import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { Transaction } from '@/lib/types';
import { getCachedAppSettings } from '@/lib/app-settings';

export async function getTransactions(): Promise<Transaction[]> {
  const items = await getItem<Transaction[]>(STORAGE_KEYS.transactions, []);
  const defaultCurrency = getCachedAppSettings().currency ?? 'ARS';
  const normalized = items.map((item) => ({
    currency: item.currency ?? defaultCurrency,
    ...item,
  }));
  return normalized.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveTransactions(items: Transaction[]): Promise<void> {
  await setItem(STORAGE_KEYS.transactions, items);
}

export async function addTransaction(item: Transaction): Promise<Transaction[]> {
  const items = await getTransactions();
  const next = [item, ...items];
  await saveTransactions(next);
  return next;
}

export async function updateTransactionCategory(previous: string, nextName: string): Promise<Transaction[]> {
  const items = await getTransactions();
  const next = items.map((tx) => (tx.category === previous ? { ...tx, category: nextName } : tx));
  await saveTransactions(next);
  return next;
}

export async function updateTransactionMethod(previous: string, nextName: string): Promise<Transaction[]> {
  const items = await getTransactions();
  const next = items.map((tx) => (tx.method === previous ? { ...tx, method: nextName } : tx));
  await saveTransactions(next);
  return next;
}
