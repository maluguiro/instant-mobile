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

export async function getCategories(): Promise<string[]> {
  const stored = await getItem<string[]>(STORAGE_KEYS.categories, []);
  const merged = Array.from(new Set([...stored, ...DEFAULT_CATEGORIES]));
  return merged;
}

export async function addCategory(name: string): Promise<string[]> {
  const trimmed = name.trim();
  if (!trimmed) {
    return getCategories();
  }
  const items = await getItem<string[]>(STORAGE_KEYS.categories, []);
  const next = Array.from(new Set([trimmed, ...items]));
  await setItem(STORAGE_KEYS.categories, next);
  return getCategories();
}
