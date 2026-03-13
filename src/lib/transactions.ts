import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { Transaction } from '@/lib/types';

export async function getTransactions(): Promise<Transaction[]> {
  const items = await getItem<Transaction[]>(STORAGE_KEYS.transactions, []);
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
