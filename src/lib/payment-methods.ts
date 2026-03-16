import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';

function normalize(value: string) {
  return value.trim();
}

function equalsIgnoreCase(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;
}

export async function getPaymentMethods(): Promise<string[]> {
  return getItem<string[]>(STORAGE_KEYS.paymentMethods, []);
}

export async function addPaymentMethod(method: string): Promise<string[]> {
  const current = await getPaymentMethods();
  const normalized = normalize(method);
  if (!normalized) {
    return current;
  }
  const exists = current.some((item) => equalsIgnoreCase(item, normalized));
  const next = exists ? current : [normalized, ...current];
  await setItem<string[]>(STORAGE_KEYS.paymentMethods, next);
  return next;
}

export async function updatePaymentMethod(previous: string, nextName: string): Promise<string[]> {
  const current = await getPaymentMethods();
  const normalized = normalize(nextName);
  if (!normalized) {
    return current;
  }
  const exists = current.some((item) => equalsIgnoreCase(item, normalized));
  if (exists) {
    return current;
  }
  const updated = current.map((item) => (equalsIgnoreCase(item, previous) ? normalized : item));
  await setItem<string[]>(STORAGE_KEYS.paymentMethods, updated);
  return updated;
}

export async function removePaymentMethod(method: string): Promise<string[]> {
  const current = await getPaymentMethods();
  const next = current.filter((item) => !equalsIgnoreCase(item, method));
  await setItem<string[]>(STORAGE_KEYS.paymentMethods, next);
  return next;
}
