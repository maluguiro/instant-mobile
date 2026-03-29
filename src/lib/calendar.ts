import { getActiveDataScope, scopedKey } from '@/lib/data-scope';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { CurrencyCode, getCachedAppSettings } from '@/lib/app-settings';

export type DueDate = {
  id: string;
  name: string;
  amount: number;
  currency: CurrencyCode;
  date: string; // YYYY-MM-DD
  category?: string;
  method?: string;
  note?: string;
  important?: boolean;
  calendarExported?: boolean;
  status?: 'pending' | 'paid';
  createdAt: string;
};

export type RecurringPayment = {
  id: string;
  name: string;
  amount: number;
  currency: CurrencyCode;
  frequency: 'weekly' | 'monthly' | 'everyX';
  everyDays?: number;
  nextDate: string; // YYYY-MM-DD
  durationType?: 'indefinite' | 'months' | 'until';
  durationMonths?: number;
  endDate?: string;
  category?: string;
  method?: string;
  important?: boolean;
  calendarExported?: boolean;
  status?: 'active' | 'paused' | 'ended';
  createdAt: string;
};

export type Installment = {
  id: string;
  name: string;
  amount: number;
  currency: CurrencyCode;
  total: number;
  current: number;
  nextDate: string; // YYYY-MM-DD
  category?: string;
  method?: string;
  important?: boolean;
  calendarExported?: boolean;
  status?: 'active' | 'completed';
  createdAt: string;
};

export async function getDueDates(): Promise<DueDate[]> {
  const scope = await getActiveDataScope();
  const items = await getItem<DueDate[]>(scopedKey(STORAGE_KEYS.dueDates, scope), []);
  const defaultCurrency = getCachedAppSettings().currency ?? 'ARS';
  return items.map((item) => ({
    status: 'pending',
    currency: item.currency ?? defaultCurrency,
    important: Boolean(item.important),
    calendarExported: Boolean(item.calendarExported),
    ...item,
  }));
}

export async function saveDueDates(items: DueDate[]): Promise<void> {
  const scope = await getActiveDataScope();
  await setItem(scopedKey(STORAGE_KEYS.dueDates, scope), items);
}

export async function addDueDate(item: DueDate): Promise<DueDate[]> {
  const items = await getDueDates();
  const next = [item, ...items];
  await saveDueDates(next);
  return next;
}

export async function removeDueDate(id: string): Promise<DueDate[]> {
  const items = await getDueDates();
  const next = items.filter((item) => item.id !== id);
  await saveDueDates(next);
  return next;
}

export async function getRecurringPayments(): Promise<RecurringPayment[]> {
  const scope = await getActiveDataScope();
  const items = await getItem<RecurringPayment[]>(scopedKey(STORAGE_KEYS.recurringPayments, scope), []);
  const defaultCurrency = getCachedAppSettings().currency ?? 'ARS';
  return items.map((item) => ({
    status: 'active',
    durationType: 'indefinite',
    durationMonths: 0,
    currency: item.currency ?? defaultCurrency,
    important: Boolean(item.important),
    calendarExported: Boolean(item.calendarExported),
    ...item,
  }));
}

export async function saveRecurringPayments(items: RecurringPayment[]): Promise<void> {
  const scope = await getActiveDataScope();
  await setItem(scopedKey(STORAGE_KEYS.recurringPayments, scope), items);
}

export async function addRecurringPayment(item: RecurringPayment): Promise<RecurringPayment[]> {
  const items = await getRecurringPayments();
  const next = [item, ...items];
  await saveRecurringPayments(next);
  return next;
}

export async function removeRecurringPayment(id: string): Promise<RecurringPayment[]> {
  const items = await getRecurringPayments();
  const next = items.filter((item) => item.id !== id);
  await saveRecurringPayments(next);
  return next;
}

export async function getInstallments(): Promise<Installment[]> {
  const scope = await getActiveDataScope();
  const items = await getItem<Installment[]>(scopedKey(STORAGE_KEYS.installments, scope), []);
  const defaultCurrency = getCachedAppSettings().currency ?? 'ARS';
  return items.map((item) => ({
    status: item.current >= item.total ? 'completed' : 'active',
    currency: item.currency ?? defaultCurrency,
    important: Boolean(item.important),
    calendarExported: Boolean(item.calendarExported),
    ...item,
  }));
}

export async function saveInstallments(items: Installment[]): Promise<void> {
  const scope = await getActiveDataScope();
  await setItem(scopedKey(STORAGE_KEYS.installments, scope), items);
}

export async function addInstallment(item: Installment): Promise<Installment[]> {
  const items = await getInstallments();
  const next = [item, ...items];
  await saveInstallments(next);
  return next;
}

export async function removeInstallment(id: string): Promise<Installment[]> {
  const items = await getInstallments();
  const next = items.filter((item) => item.id !== id);
  await saveInstallments(next);
  return next;
}
