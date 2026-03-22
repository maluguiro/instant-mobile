import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';

export type CurrencyCode = 'ARS' | 'USD' | 'EUR' | 'BRL' | 'CLP' | 'UYU';

export type AppSettings = {
  currency: CurrencyCode;
  theme: 'light' | 'dark';
  notifications: {
    dueDates: boolean;
    weekly: boolean;
    savings: boolean;
    installments: boolean;
    importantEnabled: boolean;
    snoozeEnabled: boolean;
    dueDatesImportantOnly: boolean;
    dueDatesMinAmount: number;
    advanceDays: {
      dueDates: number;
      weekly: number;
      savings: number;
      installments: number;
    };
    customized: {
      dueDates: boolean;
      weekly: boolean;
      savings: boolean;
      installments: boolean;
      important: boolean;
    };
    important: {
      time: string;
      advanceDays: number;
      repeatDays: number;
    };
    times: {
      dueDates: string; // HH:MM
      weekly: string;
      savings: string;
      installments: string;
    };
  };
};

export const defaultAppSettings: AppSettings = {
  currency: 'ARS',
  theme: 'light',
  notifications: {
    dueDates: true,
    weekly: false,
    savings: true,
    installments: true,
    importantEnabled: false,
    snoozeEnabled: true,
    dueDatesImportantOnly: false,
    dueDatesMinAmount: 0,
    advanceDays: {
      dueDates: 2,
      weekly: 2,
      savings: 2,
      installments: 2,
    },
    customized: {
      dueDates: false,
      weekly: false,
      savings: false,
      installments: false,
      important: false,
    },
    important: {
      time: '11:00',
      advanceDays: 2,
      repeatDays: 1,
    },
    times: {
      dueDates: '11:00',
      weekly: '11:00',
      savings: '11:00',
      installments: '11:00',
    },
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
  const legacyTimes = stored.notifications?.times ?? {};
  const normalizeTime = (value?: string) => {
    if (!value) return '11:00';
    if (value === 'morning') return '09:00';
    if (value === 'afternoon') return '15:00';
    if (value === 'evening') return '20:00';
    return value;
  };
  const next: AppSettings = {
    ...defaultAppSettings,
    ...stored,
    notifications: {
      ...defaultAppSettings.notifications,
      ...(stored.notifications ?? {}),
      advanceDays: {
        ...defaultAppSettings.notifications.advanceDays,
        ...(stored.notifications?.advanceDays ?? {}),
      },
      customized: {
        ...defaultAppSettings.notifications.customized,
        ...(stored.notifications?.customized ?? {}),
      },
      important: {
        ...defaultAppSettings.notifications.important,
        ...(stored.notifications?.important ?? {}),
      },
      times: {
        dueDates: normalizeTime(legacyTimes.dueDates),
        weekly: normalizeTime(legacyTimes.weekly),
        savings: normalizeTime(legacyTimes.savings),
        installments: normalizeTime(legacyTimes.installments),
      },
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
      advanceDays: {
        ...current.notifications.advanceDays,
        ...(partial.notifications?.advanceDays ?? {}),
      },
      customized: {
        ...current.notifications.customized,
        ...(partial.notifications?.customized ?? {}),
      },
      important: {
        ...current.notifications.important,
        ...(partial.notifications?.important ?? {}),
      },
      times: {
        ...current.notifications.times,
        ...(partial.notifications?.times ?? {}),
      },
    },
  };
  await saveAppSettings(next);
  return next;
}
