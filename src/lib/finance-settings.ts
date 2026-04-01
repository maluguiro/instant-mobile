import { getActiveDataScope, scopedKey } from '@/lib/data-scope';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { CurrencyCode, defaultAppSettings } from '@/lib/app-settings';

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
  savingsWeekday: number; // 0-6, Monday = 1
  savingsCurrency: CurrencyCode;
  savingsSkipMonth: string | null;
  weeklyMode: WeeklyMode;
  weeklyAmount: number;
  weeklyRenewal: WeeklyRenewalMode;
  weeklyCustomDay: number; // 0-6, Monday = 1
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

export async function getFinanceSettings(): Promise<FinanceSettings> {
  const scope = await getActiveDataScope();
  const stored = await getItem<Partial<FinanceSettings>>(scopedKey(STORAGE_KEYS.financeSettings, scope), {});
  return { ...defaultFinanceSettings, ...stored };
}

export async function saveFinanceSettings(settings: FinanceSettings): Promise<void> {
  const scope = await getActiveDataScope();
  await setItem<FinanceSettings>(scopedKey(STORAGE_KEYS.financeSettings, scope), settings);
}
