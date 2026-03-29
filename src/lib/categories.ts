import { apiRequest } from '@/lib/api';
import { getCachedAuthState, loadAuthState } from '@/lib/auth';
import { getActiveDataScope, scopedKey, withDuoQuery } from '@/lib/data-scope';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';

const DEFAULT_CATEGORIES = [
  'Comida',
  'Transporte',
  'Hogar',
  'Servicios',
  'Ocio',
  'Salud',
  'Ahorro',
] as const;

export const BASE_CATEGORIES = [...DEFAULT_CATEGORIES];

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

async function getPendingCreates(scope: Awaited<ReturnType<typeof getActiveDataScope>>) {
  return getItem<string[]>(scopedKey(STORAGE_KEYS.categoriesPendingCreates, scope), []);
}

async function getPendingDeletes(scope: Awaited<ReturnType<typeof getActiveDataScope>>) {
  return getItem<string[]>(scopedKey(STORAGE_KEYS.categoriesPendingDeletes, scope), []);
}

async function getPendingUpdates(scope: Awaited<ReturnType<typeof getActiveDataScope>>) {
  return getItem<PendingUpdate[]>(scopedKey(STORAGE_KEYS.categoriesPendingUpdates, scope), []);
}

async function setPendingCreates(scope: Awaited<ReturnType<typeof getActiveDataScope>>, items: string[]) {
  await setItem(scopedKey(STORAGE_KEYS.categoriesPendingCreates, scope), items);
}

async function setPendingDeletes(scope: Awaited<ReturnType<typeof getActiveDataScope>>, items: string[]) {
  await setItem(scopedKey(STORAGE_KEYS.categoriesPendingDeletes, scope), items);
}

async function setPendingUpdates(
  scope: Awaited<ReturnType<typeof getActiveDataScope>>,
  items: PendingUpdate[]
) {
  await setItem(scopedKey(STORAGE_KEYS.categoriesPendingUpdates, scope), items);
}

async function syncPending(
  token: string,
  current: string[],
  scope: Awaited<ReturnType<typeof getActiveDataScope>>
): Promise<string[]> {
  let next = current;

  const pendingDeletes = await getPendingDeletes(scope);
  if (pendingDeletes.length > 0) {
    const remaining: string[] = [];
    for (const name of pendingDeletes) {
      try {
        await apiRequest(withDuoQuery(`/categories/${encodeURIComponent(name)}`, scope), {
          method: 'DELETE',
          token,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (!message.includes('Categoría no encontrada')) {
          remaining.push(name);
        }
      }
    }
    await setPendingDeletes(scope, remaining);
    next = next.filter((item) => !pendingDeletes.some((name) => equalsIgnoreCase(name, item)));
  }

  const pendingUpdates = await getPendingUpdates(scope);
  if (pendingUpdates.length > 0) {
    const remaining: PendingUpdate[] = [];
    for (const entry of pendingUpdates) {
      try {
        await apiRequest(withDuoQuery(`/categories/${encodeURIComponent(entry.from)}`, scope), {
          method: 'PUT',
          token,
          body: { name: entry.to },
        });
        next = next.map((item) => (equalsIgnoreCase(item, entry.from) ? entry.to : item));
      } catch {
        remaining.push(entry);
      }
    }
    await setPendingUpdates(scope, remaining);
  }

  const pendingCreates = await getPendingCreates(scope);
  if (pendingCreates.length > 0) {
    const remaining: string[] = [];
    for (const name of pendingCreates) {
      try {
        await apiRequest(withDuoQuery('/categories', scope), { method: 'POST', token, body: { name } });
        if (!next.some((item) => equalsIgnoreCase(item, name))) {
          next = [name, ...next];
        }
      } catch {
        remaining.push(name);
      }
    }
    await setPendingCreates(scope, remaining);
  }

  return next;
}
export async function getCategories(): Promise<string[]> {
  const scope = await getActiveDataScope();
  const storageKey = scopedKey(STORAGE_KEYS.categories, scope);
  const token = await getAuthToken();
  const stored = await getItem<string[]>(storageKey, []);
  if (!token) {
    return Array.from(new Set([...stored, ...DEFAULT_CATEGORIES]));
  }
  try {
    const items = await apiRequest<{ id: string; name: string }[]>(withDuoQuery('/categories', scope), {
      method: 'GET',
      token,
    });
    let names = items.map((item) => item.name);
    names = names.filter((item) => !isBaseCategory(item));
    const pendingDeletes = await getPendingDeletes(scope);
    if (pendingDeletes.length > 0) {
      names = names.filter((item) => !pendingDeletes.some((name) => equalsIgnoreCase(name, item)));
    }
    const pendingUpdates = await getPendingUpdates(scope);
    if (pendingUpdates.length > 0) {
      names = names.map((item) => {
        const update = pendingUpdates.find((entry) => equalsIgnoreCase(entry.from, item));
        return update ? update.to : item;
      });
    }
    const pendingCreates = await getPendingCreates(scope);
    if (pendingCreates.length > 0) {
      for (const name of pendingCreates) {
        if (!names.some((item) => equalsIgnoreCase(item, name))) {
          names.unshift(name);
        }
      }
    }
    names = await syncPending(token, names, scope);
    await setItem(storageKey, names);
    return Array.from(new Set([...names, ...DEFAULT_CATEGORIES]));
  } catch {
    return Array.from(new Set([...stored, ...DEFAULT_CATEGORIES]));
  }
}

export async function addCategory(name: string): Promise<string[]> {
  const trimmed = normalize(name);
  if (!trimmed) {
    return getCategories();
  }
  if (isBaseCategory(trimmed)) {
    return getCategories();
  }
  const scope = await getActiveDataScope();
  const storageKey = scopedKey(STORAGE_KEYS.categories, scope);
  const token = await getAuthToken();
  const items = await getItem<string[]>(storageKey, []);
  const exists =
    items.some((item) => equalsIgnoreCase(item, trimmed)) ||
    DEFAULT_CATEGORIES.some((item) => equalsIgnoreCase(item, trimmed));
  if (exists) return getCategories();
  if (!token) {
    const next = [trimmed, ...items];
    await setItem(storageKey, next);
    return getCategories();
  }
  try {
    await apiRequest(withDuoQuery('/categories', scope), { method: 'POST', token, body: { name: trimmed } });
    const next = [trimmed, ...items];
    await setItem(storageKey, next);
    return getCategories();
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('ya existe')) {
      return getCategories();
    }
    const next = [trimmed, ...items];
    await setItem(storageKey, next);
    const pending = await getPendingCreates(scope);
    await setPendingCreates(scope, [trimmed, ...pending]);
    return getCategories();
  }
}

export async function updateCategory(previous: string, nextName: string): Promise<string[]> {
  const trimmed = normalize(nextName);
  if (!trimmed) {
    return getCategories();
  }
  if (isBaseCategory(previous)) {
    return getCategories();
  }
  const scope = await getActiveDataScope();
  const storageKey = scopedKey(STORAGE_KEYS.categories, scope);
  const items = await getItem<string[]>(storageKey, []);
  const exists =
    items.some((item) => equalsIgnoreCase(item, trimmed)) || DEFAULT_CATEGORIES.some((item) => equalsIgnoreCase(item, trimmed));
  if (exists) {
    return getCategories();
  }
  const token = await getAuthToken();
  const updated = items.map((item) => (equalsIgnoreCase(item, previous) ? trimmed : item));
  await setItem(storageKey, updated);
  if (!token) {
    const pending = await getPendingUpdates(scope);
    await setPendingUpdates(scope, [{ from: previous, to: trimmed }, ...pending]);
    return getCategories();
  }
  try {
    await apiRequest(withDuoQuery(`/categories/${encodeURIComponent(previous)}`, scope), {
      method: 'PUT',
      token,
      body: { name: trimmed },
    });
    return getCategories();
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('ya existe') || message.includes('no encontrada')) {
      return getCategories();
    }
    const pending = await getPendingUpdates(scope);
    await setPendingUpdates(scope, [{ from: previous, to: trimmed }, ...pending]);
    return getCategories();
  }
}

export async function removeCategory(name: string): Promise<string[]> {
  const scope = await getActiveDataScope();
  const storageKey = scopedKey(STORAGE_KEYS.categories, scope);
  const items = await getItem<string[]>(storageKey, []);
  if (isBaseCategory(name)) {
    return getCategories();
  }
  const token = await getAuthToken();
  const next = items.filter((item) => !equalsIgnoreCase(item, name));
  await setItem(storageKey, next);
  if (!token) {
    const pending = await getPendingDeletes(scope);
    await setPendingDeletes(scope, [name, ...pending]);
    return getCategories();
  }
  try {
    await apiRequest(withDuoQuery(`/categories/${encodeURIComponent(name)}`, scope), { method: 'DELETE', token });
    return getCategories();
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('en uso') || message.includes('no encontrada')) {
      return getCategories();
    }
    const pending = await getPendingDeletes(scope);
    await setPendingDeletes(scope, [name, ...pending]);
    return getCategories();
  }
}

export function isBaseCategory(name: string): boolean {
  return DEFAULT_CATEGORIES.some((item) => equalsIgnoreCase(item, name));
}

