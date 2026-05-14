import { apiRequest } from '@/lib/api';
import { getCachedAuthState, loadAuthState } from '@/lib/auth';
import { getActiveDataScope, scopedKey, withDuoQuery } from '@/lib/data-scope';
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

async function getAuthToken() {
  const cached = getCachedAuthState();
  if (cached.token) return cached.token;
  const loaded = await loadAuthState();
  return loaded.token;
}

function isDuoScope(scope: Awaited<ReturnType<typeof getActiveDataScope>>) {
  return scope.type === 'duo';
}

function isUnsupportedRemoteStorage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes('almacenamiento remoto') && message.includes('no est');
}

export async function getDueDates(): Promise<DueDate[]> {
  const scope = await getActiveDataScope();
  const items = await getItem<DueDate[]>(scopedKey(STORAGE_KEYS.dueDates, scope), []);
  const defaultCurrency = getCachedAppSettings().currency ?? 'ARS';
  const token = await getAuthToken();
  if (isDuoScope(scope) && token) {
    try {
      const remote = await apiRequest<DueDate[]>(withDuoQuery('/calendar/due-dates', scope), {
        method: 'GET',
        token,
      });
      const normalized = remote.map((item) => ({
        status: item.status ?? 'pending',
        currency: item.currency ?? defaultCurrency,
        important: Boolean(item.important),
        calendarExported: Boolean(item.calendarExported),
        ...item,
      }));
      await setItem(scopedKey(STORAGE_KEYS.dueDates, scope), normalized);
      return normalized;
    } catch (error) {
      if (isUnsupportedRemoteStorage(error)) {
        return items.map((item) => ({
          status: 'pending',
          currency: item.currency ?? defaultCurrency,
          important: Boolean(item.important),
          calendarExported: Boolean(item.calendarExported),
          ...item,
        }));
      }
      return items.map((item) => ({
        status: 'pending',
        currency: item.currency ?? defaultCurrency,
        important: Boolean(item.important),
        calendarExported: Boolean(item.calendarExported),
        ...item,
      }));
    }
  }
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
  const scope = await getActiveDataScope();
  const token = await getAuthToken();
  if (isDuoScope(scope) && token) {
    try {
      const created = await apiRequest<DueDate>(withDuoQuery('/calendar/due-dates', scope), {
        method: 'POST',
        token,
        body: item,
      });
      const next = [created, ...items];
      await saveDueDates(next);
      return next;
    } catch (error) {
      if (!isUnsupportedRemoteStorage(error)) {
        throw error;
      }
    }
  }
  const next = [item, ...items];
  await saveDueDates(next);
  return next;
}

export async function updateDueDate(
  id: string,
  patch: Partial<DueDate>
): Promise<DueDate[]> {
  const items = await getDueDates();
  const scope = await getActiveDataScope();
  const token = await getAuthToken();
  if (isDuoScope(scope) && token) {
    try {
      const updated = await apiRequest<DueDate>(withDuoQuery(`/calendar/due-dates/${id}`, scope), {
        method: 'PUT',
        token,
        body: patch,
      });
      const next = items.map((item) => (item.id === id ? { ...item, ...updated } : item));
      await saveDueDates(next);
      return next;
    } catch (error) {
      if (!isUnsupportedRemoteStorage(error)) {
        throw error;
      }
    }
  }
  const next = items.map((item) => (item.id === id ? { ...item, ...patch } : item));
  await saveDueDates(next);
  return next;
}

export async function removeDueDate(id: string): Promise<DueDate[]> {
  const items = await getDueDates();
  const scope = await getActiveDataScope();
  const token = await getAuthToken();
  if (isDuoScope(scope) && token) {
    try {
      await apiRequest(withDuoQuery(`/calendar/due-dates/${id}`, scope), { method: 'DELETE', token });
    } catch (error) {
      if (!isUnsupportedRemoteStorage(error)) {
        throw error;
      }
    }
  }
  const next = items.filter((item) => item.id !== id);
  await saveDueDates(next);
  return next;
}

export async function getRecurringPayments(): Promise<RecurringPayment[]> {
  const scope = await getActiveDataScope();
  const items = await getItem<RecurringPayment[]>(scopedKey(STORAGE_KEYS.recurringPayments, scope), []);
  const defaultCurrency = getCachedAppSettings().currency ?? 'ARS';
  const token = await getAuthToken();
  if (isDuoScope(scope) && token) {
    try {
      const remote = await apiRequest<RecurringPayment[]>(withDuoQuery('/calendar/recurring', scope), {
        method: 'GET',
        token,
      });
      const normalized = remote.map((item) => ({
        status: item.status ?? 'active',
        durationType: item.durationType ?? 'indefinite',
        durationMonths: item.durationMonths ?? 0,
        currency: item.currency ?? defaultCurrency,
        important: Boolean(item.important),
        calendarExported: Boolean(item.calendarExported),
        ...item,
      }));
      await setItem(scopedKey(STORAGE_KEYS.recurringPayments, scope), normalized);
      return normalized;
    } catch (error) {
      if (isUnsupportedRemoteStorage(error)) {
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
  }
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
  const scope = await getActiveDataScope();
  const token = await getAuthToken();
  if (isDuoScope(scope) && token) {
    try {
      const created = await apiRequest<RecurringPayment>(withDuoQuery('/calendar/recurring', scope), {
        method: 'POST',
        token,
        body: item,
      });
      const next = [created, ...items];
      await saveRecurringPayments(next);
      return next;
    } catch (error) {
      if (!isUnsupportedRemoteStorage(error)) {
        throw error;
      }
    }
  }
  const next = [item, ...items];
  await saveRecurringPayments(next);
  return next;
}

export async function updateRecurringPayment(
  id: string,
  patch: Partial<RecurringPayment>
): Promise<RecurringPayment[]> {
  const items = await getRecurringPayments();
  const scope = await getActiveDataScope();
  const token = await getAuthToken();
  if (isDuoScope(scope) && token) {
    try {
      const updated = await apiRequest<RecurringPayment>(withDuoQuery(`/calendar/recurring/${id}`, scope), {
        method: 'PUT',
        token,
        body: patch,
      });
      const next = items.map((item) => (item.id === id ? { ...item, ...updated } : item));
      await saveRecurringPayments(next);
      return next;
    } catch (error) {
      if (!isUnsupportedRemoteStorage(error)) {
        throw error;
      }
    }
  }
  const next = items.map((item) => (item.id === id ? { ...item, ...patch } : item));
  await saveRecurringPayments(next);
  return next;
}

export async function removeRecurringPayment(id: string): Promise<RecurringPayment[]> {
  const items = await getRecurringPayments();
  const scope = await getActiveDataScope();
  const token = await getAuthToken();
  if (isDuoScope(scope) && token) {
    try {
      await apiRequest(withDuoQuery(`/calendar/recurring/${id}`, scope), { method: 'DELETE', token });
    } catch (error) {
      if (!isUnsupportedRemoteStorage(error)) {
        throw error;
      }
    }
  }
  const next = items.filter((item) => item.id !== id);
  await saveRecurringPayments(next);
  return next;
}

export async function getInstallments(): Promise<Installment[]> {
  const scope = await getActiveDataScope();
  const items = await getItem<Installment[]>(scopedKey(STORAGE_KEYS.installments, scope), []);
  const defaultCurrency = getCachedAppSettings().currency ?? 'ARS';
  const token = await getAuthToken();
  if (isDuoScope(scope) && token) {
    try {
      const remote = await apiRequest<Installment[]>(withDuoQuery('/calendar/installments', scope), {
        method: 'GET',
        token,
      });
      const normalized = remote.map((item) => ({
        status: item.status ?? (item.current >= item.total ? 'completed' : 'active'),
        currency: item.currency ?? defaultCurrency,
        important: Boolean(item.important),
        calendarExported: Boolean(item.calendarExported),
        ...item,
      }));
      await setItem(scopedKey(STORAGE_KEYS.installments, scope), normalized);
      return normalized;
    } catch (error) {
      if (isUnsupportedRemoteStorage(error)) {
        return items.map((item) => ({
          status: item.current >= item.total ? 'completed' : 'active',
          currency: item.currency ?? defaultCurrency,
          important: Boolean(item.important),
          calendarExported: Boolean(item.calendarExported),
          ...item,
        }));
      }
      return items.map((item) => ({
        status: item.current >= item.total ? 'completed' : 'active',
        currency: item.currency ?? defaultCurrency,
        important: Boolean(item.important),
        calendarExported: Boolean(item.calendarExported),
        ...item,
      }));
    }
  }
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
  const scope = await getActiveDataScope();
  const token = await getAuthToken();
  if (isDuoScope(scope) && token) {
    try {
      const created = await apiRequest<Installment>(withDuoQuery('/calendar/installments', scope), {
        method: 'POST',
        token,
        body: item,
      });
      const next = [created, ...items];
      await saveInstallments(next);
      return next;
    } catch (error) {
      if (!isUnsupportedRemoteStorage(error)) {
        throw error;
      }
    }
  }
  const next = [item, ...items];
  await saveInstallments(next);
  return next;
}

export async function updateInstallment(
  id: string,
  patch: Partial<Installment>
): Promise<Installment[]> {
  const items = await getInstallments();
  const scope = await getActiveDataScope();
  const token = await getAuthToken();
  if (isDuoScope(scope) && token) {
    try {
      const updated = await apiRequest<Installment>(withDuoQuery(`/calendar/installments/${id}`, scope), {
        method: 'PUT',
        token,
        body: patch,
      });
      const next = items.map((item) => (item.id === id ? { ...item, ...updated } : item));
      await saveInstallments(next);
      return next;
    } catch (error) {
      if (!isUnsupportedRemoteStorage(error)) {
        throw error;
      }
    }
  }
  const next = items.map((item) => (item.id === id ? { ...item, ...patch } : item));
  await saveInstallments(next);
  return next;
}

export async function removeInstallment(id: string): Promise<Installment[]> {
  const items = await getInstallments();
  const scope = await getActiveDataScope();
  const token = await getAuthToken();
  if (isDuoScope(scope) && token) {
    try {
      await apiRequest(withDuoQuery(`/calendar/installments/${id}`, scope), { method: 'DELETE', token });
    } catch (error) {
      if (!isUnsupportedRemoteStorage(error)) {
        throw error;
      }
    }
  }
  const next = items.filter((item) => item.id !== id);
  await saveInstallments(next);
  return next;
}
