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

export async function getCategories(): Promise<string[]> {
  const stored = await getItem<string[]>(STORAGE_KEYS.categories, []);
  const merged = Array.from(new Set([...stored, ...DEFAULT_CATEGORIES]));
  return merged;
}

export async function addCategory(name: string): Promise<string[]> {
  const trimmed = normalize(name);
  if (!trimmed) {
    return getCategories();
  }
  const items = await getItem<string[]>(STORAGE_KEYS.categories, []);
  const exists = items.some((item) => equalsIgnoreCase(item, trimmed)) || DEFAULT_CATEGORIES.some((item) =>
    equalsIgnoreCase(item, trimmed)
  );
  const next = exists ? items : [trimmed, ...items];
  await setItem(STORAGE_KEYS.categories, next);
  return getCategories();
}

export async function updateCategory(previous: string, nextName: string): Promise<string[]> {
  const trimmed = normalize(nextName);
  if (!trimmed) {
    return getCategories();
  }
  const items = await getItem<string[]>(STORAGE_KEYS.categories, []);
  const exists =
    items.some((item) => equalsIgnoreCase(item, trimmed)) || DEFAULT_CATEGORIES.some((item) => equalsIgnoreCase(item, trimmed));
  if (exists) {
    return getCategories();
  }
  const updated = items.map((item) => (equalsIgnoreCase(item, previous) ? trimmed : item));
  await setItem(STORAGE_KEYS.categories, updated);
  return getCategories();
}

export async function removeCategory(name: string): Promise<string[]> {
  const items = await getItem<string[]>(STORAGE_KEYS.categories, []);
  const next = items.filter((item) => !equalsIgnoreCase(item, name));
  await setItem(STORAGE_KEYS.categories, next);
  return getCategories();
}

export function isBaseCategory(name: string): boolean {
  return DEFAULT_CATEGORIES.some((item) => equalsIgnoreCase(item, name));
}
