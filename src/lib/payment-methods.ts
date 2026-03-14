import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';

export async function getPaymentMethods(): Promise<string[]> {
  return getItem<string[]>(STORAGE_KEYS.paymentMethods, []);
}

export async function addPaymentMethod(method: string): Promise<string[]> {
  const current = await getPaymentMethods();
  const normalized = method.trim();
  if (!normalized) {
    return current;
  }
  const exists = current.some((item) => item.toLowerCase() === normalized.toLowerCase());
  const next = exists ? current : [normalized, ...current];
  await setItem<string[]>(STORAGE_KEYS.paymentMethods, next);
  return next;
}
