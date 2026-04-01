import { addTransaction, deleteTransaction, getTransactions, updateTransaction } from '@/lib/transactions';
import { contributeToGoal } from '@/lib/goals';
import { FinanceSettings, getFinanceSettings, saveFinanceSettings } from '@/lib/finance-settings';
import { Transaction } from '@/lib/types';
import { CurrencyCode } from '@/lib/app-settings';
import { calculateAvailable, calculateTotals, filterByCurrency, filterByMonth, toISODate } from '@/lib/finance';

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getLastWeekday(reference: Date, weekday: number) {
  const base = startOfDay(reference);
  const day = base.getDay();
  const delta = (day - weekday + 7) % 7;
  base.setDate(base.getDate() - delta);
  return base;
}

function daysBetween(a: Date, b: Date) {
  const diff = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.floor(diff / 86400000);
}

export type WeeklyRenewalOutcome =
  | { status: 'none' }
  | { status: 'pending'; amount: number; available: number }
  | { status: 'confirm'; amount: number; available: number }
  | { status: 'renewed'; amount: number; carryover: number };

export async function ensureWeeklyRenewal(
  transactions: Transaction[] | null,
  currency: string
): Promise<WeeklyRenewalOutcome> {
  const settings = await getFinanceSettings();
  const weeklyMode = settings.weeklyMode === 'auto' ? 'fixed' : settings.weeklyMode;
  if (weeklyMode !== 'fixed') return { status: 'none' };
  if (settings.weeklyAmount <= 0) return { status: 'none' };
  if (settings.weeklyRenewal === 'manual') return { status: 'none' };

  const baseTransactions = transactions ?? (await getTransactions());
  await fixWeeklyRenewalAmounts(baseTransactions, Math.max(settings.weeklyAmount, 0), currency as CurrencyCode);

  const today = startOfDay(new Date());
  const lastRenewedAt = settings.weeklyLastRenewedAt ? startOfDay(new Date(settings.weeklyLastRenewedAt)) : null;

  const monthlyAvailable = getMonthlyAvailable(settings, baseTransactions, currency);
  const weeklyAmount = Math.max(settings.weeklyAmount, 0);

  const hasRenewalSince = (from: Date) => {
    const fromISO = toISODate(from);
    return baseTransactions.some(
      (tx) =>
        tx.date >= fromISO &&
        (tx.system === 'weekly-renewal' ||
          tx.category === 'Renovación semanal' ||
          tx.category === 'RenovaciÃ³n semanal')
    );
  };

  let shouldRenew = false;
  if (!lastRenewedAt) {
    shouldRenew = true;
  } else if (settings.weeklyRenewal === 'everyX') {
    shouldRenew = daysBetween(lastRenewedAt, today) >= Math.max(settings.weeklyEveryDays, 1);
  } else if (settings.weeklyRenewal === 'custom') {
    const lastCustom = getLastWeekday(today, settings.weeklyCustomDay);
    shouldRenew = lastRenewedAt < lastCustom;
  } else {
    const lastMonday = getLastWeekday(today, 1);
    shouldRenew = lastRenewedAt < lastMonday;
  }

  if (!shouldRenew && lastRenewedAt && !hasRenewalSince(lastRenewedAt)) {
    shouldRenew = true;
  }

  if (settings.weeklyPendingRenewal) {
    if (monthlyAvailable >= weeklyAmount) {
      return { status: 'confirm', amount: weeklyAmount, available: monthlyAvailable };
    }
    return { status: 'pending', amount: weeklyAmount, available: monthlyAvailable };
  }

  if (!shouldRenew) return { status: 'none' };

  if (monthlyAvailable < weeklyAmount) {
    await saveFinanceSettings({
      ...settings,
      weeklyPendingRenewal: true,
      weeklyPendingSince: today.toISOString(),
      weeklyPendingAmount: weeklyAmount,
    });
    return { status: 'pending', amount: weeklyAmount, available: monthlyAvailable };
  }

  return applyWeeklyRenewal(baseTransactions, currency);
}

export async function applyWeeklyRenewal(
  transactions: Transaction[] | null,
  currency: string
): Promise<WeeklyRenewalOutcome> {
  const settings = await getFinanceSettings();
  const baseTransactions = transactions ?? (await getTransactions());
  const today = startOfDay(new Date());
  const lastRenewedAt = settings.weeklyLastRenewedAt ? startOfDay(new Date(settings.weeklyLastRenewedAt)) : null;

  let carryover = 0;
  if (lastRenewedAt && settings.weeklyLastRenewalAmount > 0) {
    const lastTotal = Math.max(settings.weeklyLastRenewalAmount + (settings.weeklyLastCarryover ?? 0), 0);
    const from = toISODate(lastRenewedAt);
    const spent = baseTransactions.reduce((acc, tx) => {
      if (!tx.weekly || tx.type !== 'expense') return acc;
      if (tx.date < from) return acc;
      return acc + tx.amount;
    }, 0);
    carryover = Math.max(lastTotal - spent, 0);
  }

  if (carryover > 0 && settings.weeklyRolloverMode === 'goal' && settings.weeklyRolloverGoalId) {
    await contributeToGoal(settings.weeklyRolloverGoalId, carryover);
    carryover = 0;
  } else if (carryover > 0 && settings.weeklyRolloverMode === 'savings') {
    const rolloverTx: Transaction = {
      id: String(Date.now()) + '-rollover',
      type: 'expense',
      amount: carryover,
      currency: currency as CurrencyCode,
      category: 'Ahorro',
      date: toISODate(today),
      method: 'Automático',
      note: 'Sobrante semanal',
      createdAt: new Date().toISOString(),
      system: 'weekly-rollover',
    };
    await addTransaction(rolloverTx, { system: 'weekly-rollover' });
    carryover = 0;
  }

  const shouldKeepCarryover = settings.weeklyRolloverMode === 'keep' || !settings.weeklyRolloverGoalId;
  const renewalAmount = Math.max(settings.weeklyAmount, 0);
  const carryoverToKeep = shouldKeepCarryover ? carryover : 0;

  await fixWeeklyRenewalAmounts(baseTransactions, renewalAmount, currency as CurrencyCode);

  const renewalTx: Transaction = {
    id: String(Date.now()),
    type: 'expense',
    amount: renewalAmount,
    currency: currency as CurrencyCode,
    category: 'Renovación semanal',
    date: toISODate(today),
    method: 'Automático',
    note: 'Disponible semanal cargado',
    createdAt: new Date().toISOString(),
    system: 'weekly-renewal',
  };

  await addTransaction(renewalTx, { system: 'weekly-renewal' });
  await saveFinanceSettings({
    ...settings,
    weeklyLastRenewedAt: today.toISOString(),
    weeklyLastRenewalAmount: renewalAmount,
    weeklyLastCarryover: carryoverToKeep,
    weeklyPendingRenewal: false,
    weeklyPendingSince: null,
    weeklyPendingAmount: 0,
  });
  return { status: 'renewed', amount: renewalAmount, carryover: carryoverToKeep };
}

async function fixWeeklyRenewalAmounts(transactions: Transaction[], correctAmount: number, currency: CurrencyCode) {
  const renewalTxs = transactions.filter(
    (tx) => tx.system === 'weekly-renewal' && tx.currency === currency && tx.amount !== correctAmount
  );
  for (const tx of renewalTxs) {
    await updateTransaction(tx.id, { amount: correctAmount });
  }
}

export async function skipWeeklyRenewal(): Promise<void> {
  const settings = await getFinanceSettings();
  await saveFinanceSettings({
    ...settings,
    weeklyPendingRenewal: false,
    weeklyPendingSince: null,
    weeklyPendingAmount: 0,
    weeklyLastRenewedAt: startOfDay(new Date()).toISOString(),
    weeklyLastRenewalAmount: 0,
    weeklyLastCarryover: 0,
  });
}

function getMonthlyAvailable(
  settings: FinanceSettings,
  transactions: Transaction[],
  currency: string
): number {
  const monthTx = filterByMonth(filterByCurrency(transactions, currency as CurrencyCode), new Date());
  const totals = calculateTotals(monthTx, currency as CurrencyCode);
  const availability = calculateAvailable(totals, settings, currency as CurrencyCode, monthTx, new Date());
  return availability.available;
}
