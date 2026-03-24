import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { Transaction, TransactionSystem } from '@/lib/types';

export type TransactionMeta = {
  weekly?: boolean;
  system?: TransactionSystem;
};

export async function getTransactionMetaMap(): Promise<Record<string, TransactionMeta>> {
  return getItem<Record<string, TransactionMeta>>(STORAGE_KEYS.transactionMeta, {});
}

export async function setTransactionMeta(id: string, meta: TransactionMeta): Promise<void> {
  const current = await getTransactionMetaMap();
  await setItem(STORAGE_KEYS.transactionMeta, { ...current, [id]: { ...current[id], ...meta } });
}

export async function removeTransactionMeta(id: string): Promise<void> {
  const current = await getTransactionMetaMap();
  if (!current[id]) return;
  const next = { ...current };
  delete next[id];
  await setItem(STORAGE_KEYS.transactionMeta, next);
}

export async function applyTransactionMeta(items: Transaction[]): Promise<Transaction[]> {
  const meta = await getTransactionMetaMap();
  return items.map((item) => ({
    ...item,
    weekly: meta[item.id]?.weekly ?? item.weekly,
    system: meta[item.id]?.system ?? item.system,
  }));
}
