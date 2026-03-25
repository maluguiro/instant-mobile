import { addTransaction, getTransactions } from '@/lib/transactions';
import { contributeToGoal } from '@/lib/goals';
import { getFinanceSettings, saveFinanceSettings } from '@/lib/finance-settings';
import { Transaction } from '@/lib/types';
import { toISODate } from '@/lib/finance';

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

export async function ensureWeeklyRenewal(
  transactions: Transaction[] | null,
  currency: string
): Promise<boolean> {
  const settings = await getFinanceSettings();
  const weeklyMode = settings.weeklyMode === 'auto' ? 'fixed' : settings.weeklyMode;
  if (weeklyMode !== 'fixed') return false;
  if (settings.weeklyAmount <= 0) return false;
  if (settings.weeklyRenewal === 'manual') return false;

  const today = startOfDay(new Date());
  const lastRenewedAt = settings.weeklyLastRenewedAt ? startOfDay(new Date(settings.weeklyLastRenewedAt)) : null;

  const baseTransactions = transactions ?? (await getTransactions());
  const hasRenewalSince = (from: Date) => {
    const fromISO = toISODate(from);
    return baseTransactions.some(
      (tx) =>
        tx.date >= fromISO &&
        (tx.system === 'weekly-renewal' || tx.category === 'Renovación semanal')
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

  if (!shouldRenew) return false;

  let carryover = 0;
  if (lastRenewedAt && settings.weeklyLastRenewalAmount > 0) {
    const from = toISODate(lastRenewedAt);
    const spent = baseTransactions.reduce((acc, tx) => {
      if (!tx.weekly || tx.type !== 'expense') return acc;
      if (tx.date < from) return acc;
      return acc + tx.amount;
    }, 0);
    carryover = Math.max(settings.weeklyLastRenewalAmount - spent, 0);
  }

  if (carryover > 0 && settings.weeklyRolloverMode === 'goal' && settings.weeklyRolloverGoalId) {
    await contributeToGoal(settings.weeklyRolloverGoalId, carryover);
    carryover = 0;
  } else if (carryover > 0 && settings.weeklyRolloverMode === 'savings') {
    // Se registra como movimiento informativo, sin afectar cálculos (se excluye por system).
    const rolloverTx: Transaction = {
      id: String(Date.now()) + '-rollover',
      type: 'expense',
      amount: carryover,
      currency,
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
  const renewalAmount = shouldKeepCarryover ? settings.weeklyAmount + carryover : settings.weeklyAmount;

  const renewalTx: Transaction = {
    id: String(Date.now()),
    type: 'expense',
    amount: renewalAmount,
    currency,
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
  });
  return true;
}
