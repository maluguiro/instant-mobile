import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';

export type DueDate = {
  id: string;
  name: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category?: string;
  method?: string;
  note?: string;
  status?: 'pending' | 'paid';
  createdAt: string;
};

export type RecurringPayment = {
  id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'everyX';
  everyDays?: number;
  nextDate: string; // YYYY-MM-DD
  durationType?: 'indefinite' | 'months' | 'until';
  durationMonths?: number;
  endDate?: string;
  category?: string;
  method?: string;
  status?: 'active' | 'paused' | 'ended';
  createdAt: string;
};

export type Installment = {
  id: string;
  name: string;
  amount: number;
  total: number;
  current: number;
  nextDate: string; // YYYY-MM-DD
  category?: string;
  method?: string;
  status?: 'active' | 'completed';
  createdAt: string;
};

export async function getDueDates(): Promise<DueDate[]> {
  const items = await getItem<DueDate[]>(STORAGE_KEYS.dueDates, []);
  return items.map((item) => ({
    status: 'pending',
    ...item,
  }));
}

export async function saveDueDates(items: DueDate[]): Promise<void> {
  await setItem(STORAGE_KEYS.dueDates, items);
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
  const items = await getItem<RecurringPayment[]>(STORAGE_KEYS.recurringPayments, []);
  return items.map((item) => ({
    status: 'active',
    durationType: 'indefinite',
    durationMonths: 0,
    ...item,
  }));
}

export async function saveRecurringPayments(items: RecurringPayment[]): Promise<void> {
  await setItem(STORAGE_KEYS.recurringPayments, items);
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
  const items = await getItem<Installment[]>(STORAGE_KEYS.installments, []);
  return items.map((item) => ({
    status: item.current >= item.total ? 'completed' : 'active',
    ...item,
  }));
}

export async function saveInstallments(items: Installment[]): Promise<void> {
  await setItem(STORAGE_KEYS.installments, items);
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
