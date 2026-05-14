import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { getActiveDataScope, scopedKey } from '@/lib/data-scope';
import { Transaction, TransactionSystem } from '@/lib/types';

export type TransactionMeta = {
  weekly?: boolean;
  system?: TransactionSystem;
};

export async function getTransactionMetaMap(): Promise<Record<string, TransactionMeta>> {
  const scope = await getActiveDataScope();
  return getItem<Record<string, TransactionMeta>>(scopedKey(STORAGE_KEYS.transactionMeta, scope), {});
}

export async function setTransactionMeta(id: string, meta: TransactionMeta): Promise<void> {
  const current = await getTransactionMetaMap();
  const scope = await getActiveDataScope();
  await setItem(scopedKey(STORAGE_KEYS.transactionMeta, scope), { ...current, [id]: { ...current[id], ...meta } });
}

export async function removeTransactionMeta(id: string): Promise<void> {
  const current = await getTransactionMetaMap();
  if (!current[id]) return;
  const next = { ...current };
  delete next[id];
  const scope = await getActiveDataScope();
  await setItem(scopedKey(STORAGE_KEYS.transactionMeta, scope), next);
}

export async function applyTransactionMeta(items: Transaction[]): Promise<Transaction[]> {
  const meta = await getTransactionMetaMap();
  return items.map((item) => ({
    ...item,
    weekly: meta[item.id]?.weekly ?? item.weekly,
    system: meta[item.id]?.system ?? item.system,
  }));
}
