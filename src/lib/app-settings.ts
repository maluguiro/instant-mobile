import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';

export type CurrencyCode = 'ARS' | 'USD' | 'EUR' | 'BRL' | 'CLP' | 'UYU';

export type AppSettings = {
  currency: CurrencyCode;
  theme: 'light' | 'dark';
  notifications: {
    dueDates: boolean;
    weekly: boolean;
    savings: boolean;
  };
};

export const defaultAppSettings: AppSettings = {
  currency: 'ARS',
  theme: 'light',
  notifications: {
    dueDates: true,
    weekly: false,
    savings: true,
  },
};

let cachedSettings: AppSettings = defaultAppSettings;
const listeners = new Set<(settings: AppSettings) => void>();

export function getCachedAppSettings(): AppSettings {
  return cachedSettings;
}

export function subscribeAppSettings(listener: (settings: AppSettings) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(settings: AppSettings) {
  listeners.forEach((listener) => listener(settings));
}

export async function getAppSettings(): Promise<AppSettings> {
  const stored = await getItem<Partial<AppSettings>>(STORAGE_KEYS.appSettings, {});
  const next: AppSettings = {
    ...defaultAppSettings,
    ...stored,
    notifications: {
      ...defaultAppSettings.notifications,
      ...(stored.notifications ?? {}),
    },
  };
  cachedSettings = next;
  return next;
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  cachedSettings = settings;
  await setItem<AppSettings>(STORAGE_KEYS.appSettings, settings);
  notify(settings);
}

export async function updateAppSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getAppSettings();
  const next: AppSettings = {
    ...current,
    ...partial,
    notifications: {
      ...current.notifications,
      ...(partial.notifications ?? {}),
    },
  };
  await saveAppSettings(next);
  return next;
}
