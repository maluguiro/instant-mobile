import { CurrencyCode, defaultAppSettings, getAppSettings } from '@/lib/app-settings';
import { getActiveDataScope, scopedKey } from '@/lib/data-scope';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';

export type SavingsMode = 'fixed' | 'percent' | 'manual';
export type SavingsFrequency = 'monthly' | 'weekly' | 'everyX' | 'manual';
export type WeeklyMode = 'fixed' | 'auto' | 'manual';
export type WeeklyRenewalMode = 'monday' | 'custom' | 'everyX' | 'manual';

export type FinanceSettings = {
  savingsMode: SavingsMode;
  savingsFixed: number;
  savingsPercent: number;
  savingsFrequency: SavingsFrequency;
  savingsEveryDays: number;
  savingsMonthDay: number;
  savingsWeekday: number;
  savingsCurrency: CurrencyCode;
  savingsSkipMonth: string | null;
  weeklyMode: WeeklyMode;
  weeklyAmount: number;
  weeklyRenewal: WeeklyRenewalMode;
  weeklyCustomDay: number;
  weeklyEveryDays: number;
  weeklyManualEnabledAmount: number;
  weeklyManualEnabledAt: string | null;
  weeklyLastRenewedAt: string | null;
  weeklyLastRenewalAmount: number;
  weeklyLastCarryover: number;
  weeklyPendingRenewal: boolean;
  weeklyPendingSince: string | null;
  weeklyPendingAmount: number;
  weeklyRolloverMode: 'keep' | 'savings' | 'goal';
  weeklyRolloverGoalId?: string;
};

export type FinanceSettingsStore = {
  version: 2;
  selectedCurrency: CurrencyCode;
  currencies: Partial<Record<CurrencyCode, Partial<FinanceSettings>>>;
};

export const defaultFinanceSettings: FinanceSettings = {
  savingsMode: 'fixed',
  savingsFixed: 0,
  savingsPercent: 10,
  savingsFrequency: 'monthly',
  savingsEveryDays: 30,
  savingsMonthDay: 1,
  savingsWeekday: 1,
  savingsCurrency: defaultAppSettings.currency,
  savingsSkipMonth: null,
  weeklyMode: 'fixed',
  weeklyAmount: 0,
  weeklyRenewal: 'monday',
  weeklyCustomDay: 1,
  weeklyEveryDays: 7,
  weeklyManualEnabledAmount: 0,
  weeklyManualEnabledAt: null,
  weeklyLastRenewedAt: null,
  weeklyLastRenewalAmount: 0,
  weeklyLastCarryover: 0,
  weeklyPendingRenewal: false,
  weeklyPendingSince: null,
  weeklyPendingAmount: 0,
  weeklyRolloverMode: 'keep',
  weeklyRolloverGoalId: undefined,
};

export const defaultFinanceSettingsStore: FinanceSettingsStore = {
  version: 2,
  selectedCurrency: defaultAppSettings.currency,
  currencies: {
    [defaultAppSettings.currency]: { ...defaultFinanceSettings },
  },
};

function isStore(value: unknown): value is FinanceSettingsStore {
  return Boolean(value && typeof value === 'object' && 'currencies' in (value as Record<string, unknown>));
}

function sanitizeSettings(currency: CurrencyCode, partial?: Partial<FinanceSettings> | null): FinanceSettings {
  return {
    ...defaultFinanceSettings,
    ...(partial ?? {}),
    savingsCurrency: currency,
  };
}

async function getDefaultCurrency(): Promise<CurrencyCode> {
  const appSettings = await getAppSettings();
  return appSettings.currency ?? defaultAppSettings.currency;
}

export function resolveFinanceSettings(store: FinanceSettingsStore, currency: CurrencyCode): FinanceSettings {
  return sanitizeSettings(currency, store.currencies[currency]);
}

export function getFinanceSettingsCurrencies(store: FinanceSettingsStore): CurrencyCode[] {
  const keys = Object.keys(store.currencies) as CurrencyCode[];
  if (keys.includes(store.selectedCurrency)) {
    return [store.selectedCurrency, ...keys.filter((currency) => currency !== store.selectedCurrency)];
  }
  return [store.selectedCurrency, ...keys];
}

export async function getFinanceSettingsStore(): Promise<FinanceSettingsStore> {
  const scope = await getActiveDataScope();
  const raw = await getItem<unknown>(scopedKey(STORAGE_KEYS.financeSettings, scope), null);
  const defaultCurrency = await getDefaultCurrency();

  if (isStore(raw)) {
    const selectedCurrency = raw.selectedCurrency ?? defaultCurrency;
    const currencies = (raw.currencies ?? {}) as Partial<Record<CurrencyCode, Partial<FinanceSettings>>>;
    const normalized: FinanceSettingsStore = {
      version: 2,
      selectedCurrency,
      currencies: {
        ...currencies,
        [selectedCurrency]: sanitizeSettings(selectedCurrency, currencies[selectedCurrency]),
      },
    };
    return normalized;
  }

  const legacy = (raw ?? {}) as Partial<FinanceSettings>;
  const legacyCurrency = legacy.savingsCurrency ?? defaultCurrency;
  const migrated: FinanceSettingsStore = {
    version: 2,
    selectedCurrency: legacyCurrency,
    currencies: {
      [legacyCurrency]: sanitizeSettings(legacyCurrency, legacy),
    },
  };
  return migrated;
}

export async function saveFinanceSettingsStore(store: FinanceSettingsStore): Promise<void> {
  const scope = await getActiveDataScope();
  await setItem<FinanceSettingsStore>(scopedKey(STORAGE_KEYS.financeSettings, scope), store);
}

export async function getFinanceSettings(currency?: CurrencyCode): Promise<FinanceSettings> {
  const store = await getFinanceSettingsStore();
  const resolvedCurrency = currency ?? (await getDefaultCurrency());
  return resolveFinanceSettings(store, resolvedCurrency);
}

export async function saveFinanceSettings(
  settings: FinanceSettings,
  currency?: CurrencyCode
): Promise<void> {
  const store = await getFinanceSettingsStore();
  const resolvedCurrency = currency ?? settings.savingsCurrency ?? store.selectedCurrency;
  const nextStore: FinanceSettingsStore = {
    ...store,
    selectedCurrency: resolvedCurrency,
    currencies: {
      ...store.currencies,
      [resolvedCurrency]: sanitizeSettings(resolvedCurrency, settings),
    },
  };
  await saveFinanceSettingsStore(nextStore);
}

export async function setFinanceSettingsSelectedCurrency(currency: CurrencyCode): Promise<FinanceSettingsStore> {
  const store = await getFinanceSettingsStore();
  const nextStore: FinanceSettingsStore = {
    ...store,
    selectedCurrency: currency,
    currencies: {
      ...store.currencies,
      [currency]: sanitizeSettings(currency, store.currencies[currency]),
    },
  };
  await saveFinanceSettingsStore(nextStore);
  return nextStore;
}
