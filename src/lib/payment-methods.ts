import { apiRequest } from '@/lib/api';
import { getCachedAuthState, loadAuthState } from '@/lib/auth';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';

const DEFAULT_METHODS = [
  'Efectivo',
  'Débito',
  'Crédito',
  'Transferencia',
] as const;

export const BASE_PAYMENT_METHODS = [...DEFAULT_METHODS];

function normalize(value: string) {
  return value.trim();
}

function equalsIgnoreCase(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;
}

type PendingUpdate = { from: string; to: string };

async function getAuthToken() {
  const cached = getCachedAuthState();
  if (cached.token) return cached.token;
  const loaded = await loadAuthState();
  return loaded.token;
}

async function getPendingCreates() {
  return getItem<string[]>(STORAGE_KEYS.methodsPendingCreates, []);
}

async function getPendingDeletes() {
  return getItem<string[]>(STORAGE_KEYS.methodsPendingDeletes, []);
}

async function getPendingUpdates() {
  return getItem<PendingUpdate[]>(STORAGE_KEYS.methodsPendingUpdates, []);
}

async function setPendingCreates(items: string[]) {
  await setItem(STORAGE_KEYS.methodsPendingCreates, items);
}

async function setPendingDeletes(items: string[]) {
  await setItem(STORAGE_KEYS.methodsPendingDeletes, items);
}

async function setPendingUpdates(items: PendingUpdate[]) {
  await setItem(STORAGE_KEYS.methodsPendingUpdates, items);
}

async function syncPending(token: string, current: string[]): Promise<string[]> {
  let next = current;

  const pendingDeletes = await getPendingDeletes();
  if (pendingDeletes.length > 0) {
    const remaining: string[] = [];
    for (const name of pendingDeletes) {
      try {
        await apiRequest(`/payment-methods/${encodeURIComponent(name)}`, { method: 'DELETE', token });
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (!message.includes('Método no encontrado')) {
          remaining.push(name);
        }
      }
    }
    await setPendingDeletes(remaining);
    next = next.filter((item) => !pendingDeletes.some((name) => equalsIgnoreCase(name, item)));
  }

  const pendingUpdates = await getPendingUpdates();
  if (pendingUpdates.length > 0) {
    const remaining: PendingUpdate[] = [];
    for (const entry of pendingUpdates) {
      try {
        await apiRequest(`/payment-methods/${encodeURIComponent(entry.from)}`, {
          method: 'PUT',
          token,
          body: { name: entry.to },
        });
        next = next.map((item) => (equalsIgnoreCase(item, entry.from) ? entry.to : item));
      } catch {
        remaining.push(entry);
      }
    }
    await setPendingUpdates(remaining);
  }

  const pendingCreates = await getPendingCreates();
  if (pendingCreates.length > 0) {
    const remaining: string[] = [];
    for (const name of pendingCreates) {
      try {
        await apiRequest('/payment-methods', { method: 'POST', token, body: { name } });
        if (!next.some((item) => equalsIgnoreCase(item, name))) {
          next = [name, ...next];
        }
      } catch {
        remaining.push(name);
      }
    }
    await setPendingCreates(remaining);
  }

  return next;
}

export async function getPaymentMethods(): Promise<string[]> {
  const token = await getAuthToken();
  const stored = await getItem<string[]>(STORAGE_KEYS.paymentMethods, []);
  if (!token) {
    return Array.from(new Set([...stored, ...DEFAULT_METHODS]));
  }
  try {
    const items = await apiRequest<{ id: string; name: string }[]>('/payment-methods', {
      method: 'GET',
      token,
    });
    let names = items.map((item) => item.name);
    const pendingDeletes = await getPendingDeletes();
    if (pendingDeletes.length > 0) {
      names = names.filter((item) => !pendingDeletes.some((name) => equalsIgnoreCase(name, item)));
    }
    const pendingUpdates = await getPendingUpdates();
    if (pendingUpdates.length > 0) {
      names = names.map((item) => {
        const update = pendingUpdates.find((entry) => equalsIgnoreCase(entry.from, item));
        return update ? update.to : item;
      });
    }
    const pendingCreates = await getPendingCreates();
    if (pendingCreates.length > 0) {
      for (const name of pendingCreates) {
        if (!names.some((item) => equalsIgnoreCase(item, name))) {
          names.unshift(name);
        }
      }
    }
    names = await syncPending(token, names);
    await setItem(STORAGE_KEYS.paymentMethods, names);
    return Array.from(new Set([...names, ...DEFAULT_METHODS]));
  } catch {
    return Array.from(new Set([...stored, ...DEFAULT_METHODS]));
  }
}

export async function addPaymentMethod(method: string): Promise<string[]> {
  const current = await getPaymentMethods();
  const normalized = normalize(method);
  if (!normalized) {
    return current;
  }
  if (DEFAULT_METHODS.some((item) => equalsIgnoreCase(item, normalized))) {
    return current;
  }
  const token = await getAuthToken();
  const exists = current.some((item) => equalsIgnoreCase(item, normalized));
  const next = exists ? current : [normalized, ...current];
  await setItem<string[]>(
    STORAGE_KEYS.paymentMethods,
    next.filter((item) => !DEFAULT_METHODS.some((base) => equalsIgnoreCase(base, item)))
  );
  if (!token) {
    return next;
  }
  try {
    await apiRequest('/payment-methods', { method: 'POST', token, body: { name: normalized } });
    return next;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('ya existe')) {
      return next;
    }
    const pending = await getPendingCreates();
    await setPendingCreates([normalized, ...pending]);
    return next;
  }
}

export async function updatePaymentMethod(previous: string, nextName: string): Promise<string[]> {
  const current = await getPaymentMethods();
  const normalized = normalize(nextName);
  if (!normalized) {
    return current;
  }
  if (DEFAULT_METHODS.some((item) => equalsIgnoreCase(item, previous))) {
    return current;
  }
  const token = await getAuthToken();
  const exists = current.some((item) => equalsIgnoreCase(item, normalized));
  if (exists) {
    return current;
  }
  const updated = current.map((item) => (equalsIgnoreCase(item, previous) ? normalized : item));
  await setItem<string[]>(
    STORAGE_KEYS.paymentMethods,
    updated.filter((item) => !DEFAULT_METHODS.some((base) => equalsIgnoreCase(base, item)))
  );
  if (!token) {
    const pending = await getPendingUpdates();
    await setPendingUpdates([{ from: previous, to: normalized }, ...pending]);
    return updated;
  }
  try {
    await apiRequest(`/payment-methods/${encodeURIComponent(previous)}`, {
      method: 'PUT',
      token,
      body: { name: normalized },
    });
    return updated;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('ya existe') || message.includes('no encontrado')) {
      return updated;
    }
    const pending = await getPendingUpdates();
    await setPendingUpdates([{ from: previous, to: normalized }, ...pending]);
    return updated;
  }
}

export async function removePaymentMethod(method: string): Promise<string[]> {
  const current = await getPaymentMethods();
  if (DEFAULT_METHODS.some((item) => equalsIgnoreCase(item, method))) {
    return current;
  }
  const token = await getAuthToken();
  const next = current.filter((item) => !equalsIgnoreCase(item, method));
  await setItem<string[]>(
    STORAGE_KEYS.paymentMethods,
    next.filter((item) => !DEFAULT_METHODS.some((base) => equalsIgnoreCase(base, item)))
  );
  if (!token) {
    const pending = await getPendingDeletes();
    await setPendingDeletes([method, ...pending]);
    return next;
  }
  try {
    await apiRequest(`/payment-methods/${encodeURIComponent(method)}`, { method: 'DELETE', token });
    return next;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('en uso') || message.includes('no encontrado')) {
      return next;
    }
    const pending = await getPendingDeletes();
    await setPendingDeletes([method, ...pending]);
    return next;
  }
}
