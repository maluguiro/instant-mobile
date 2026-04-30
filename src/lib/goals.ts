import { getActiveDataScope, scopedKey } from '@/lib/data-scope';
import { calculateTotals, filterByCurrency, filterByMonth, startOfWeek, toISODate } from '@/lib/finance';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { getTransactions, addTransaction } from '@/lib/transactions';
import { CurrencyCode, getCachedAppSettings } from '@/lib/app-settings';

export type GoalContributionMode = 'fixed' | 'percent' | 'manual';
export type GoalFrequency = 'monthly' | 'weekly' | 'everyX' | 'manual';

export type SavingsGoal = {
  id: string;
  title: string;
  target: number;
  saved: number;
  currency: CurrencyCode;
  mode: GoalContributionMode;
  fixedAmount: number;
  percent: number;
  frequency: GoalFrequency;
  everyDays: number;
  monthDay: number;
  weekday: number;
  createdAt: string;
  lastContributionAt?: string;
};

const defaultGoal: Pick<
  SavingsGoal,
  'mode' | 'fixedAmount' | 'percent' | 'frequency' | 'everyDays' | 'monthDay' | 'weekday'
> = {
  mode: 'manual',
  fixedAmount: 0,
  percent: 0,
  frequency: 'manual',
  everyDays: 30,
  monthDay: 1,
  weekday: 1,
};

function normalizeGoal(goal: SavingsGoal): SavingsGoal {
  const defaultCurrency = getCachedAppSettings().currency ?? 'ARS';
  return {
    ...defaultGoal,
    currency: goal.currency ?? defaultCurrency,
    ...goal,
  };
}

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  const scope = await getActiveDataScope();
  const items = await getItem<SavingsGoal[]>(scopedKey(STORAGE_KEYS.savingsGoals, scope), []);
  return items.map(normalizeGoal);
}

export async function saveSavingsGoals(items: SavingsGoal[]): Promise<void> {
  const scope = await getActiveDataScope();
  await setItem<SavingsGoal[]>(scopedKey(STORAGE_KEYS.savingsGoals, scope), items);
}

export async function addSavingsGoal(goal: SavingsGoal): Promise<SavingsGoal[]> {
  const items = await getSavingsGoals();
  const next = [normalizeGoal(goal), ...items];
  await saveSavingsGoals(next);
  return next;
}

export async function updateSavingsGoal(
  id: string,
  updater: (goal: SavingsGoal) => SavingsGoal
): Promise<SavingsGoal[]> {
  const items = await getSavingsGoals();
  const next = items.map((goal) => (goal.id === id ? normalizeGoal(updater(goal)) : goal));
  await saveSavingsGoals(next);
  return next;
}

export async function contributeToGoal(
  id: string,
  amount: number
): Promise<SavingsGoal[]> {
  const delta = Math.max(amount, 0);
  if (delta <= 0) return getSavingsGoals();
  return updateSavingsGoal(id, (goal) => ({
    ...goal,
    saved: goal.saved + delta,
    lastContributionAt: new Date().toISOString(),
  }));
}

export async function recordGoalContribution(
  id: string,
  amount: number,
  options?: { date?: string; method?: string; note?: string; createdAt?: string }
): Promise<SavingsGoal[]> {
  const delta = Math.max(amount, 0);
  if (delta <= 0) return getSavingsGoals();

  const goals = await getSavingsGoals();
  const goal = goals.find((item) => item.id === id);
  if (!goal) return goals;

  const createdAt = options?.createdAt ?? new Date().toISOString();
  const date = options?.date ?? toISODate(new Date(createdAt));

  await addTransaction({
    id: String(Date.now()),
    type: 'expense',
    amount: Math.round(delta),
    currency: goal.currency,
    category: 'Ahorro',
    date,
    method: options?.method ?? `Meta: ${goal.title}`,
    note: options?.note ?? `Aporte a meta: ${goal.title}`,
    createdAt,
  });

  const next = goals.map((item) =>
    item.id === id
      ? {
          ...item,
          saved: item.saved + delta,
          lastContributionAt: createdAt,
        }
      : item
  );
  await saveSavingsGoals(next);
  return next;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function daysBetween(from: Date, to: Date) {
  return Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);
}

function calculateGoalScheduledAmount(goal: SavingsGoal, referenceDate: Date, monthlyTransactions: Awaited<ReturnType<typeof getTransactions>>) {
  if (goal.mode === 'manual') return 0;
  if (goal.mode === 'percent') {
    const monthCurrencyTransactions = filterByCurrency(filterByMonth(monthlyTransactions, referenceDate), goal.currency);
    const totals = calculateTotals(monthCurrencyTransactions, goal.currency);
    return Math.max(0, (totals.income * goal.percent) / 100);
  }
  return Math.max(0, goal.fixedAmount);
}

function isScheduledContributionDue(goal: SavingsGoal, referenceDate: Date) {
  if (goal.mode === 'manual' || goal.frequency === 'manual') return false;

  const lastContribution = goal.lastContributionAt ? new Date(goal.lastContributionAt) : null;
  if (lastContribution && Number.isNaN(lastContribution.getTime())) return false;

  if (goal.frequency === 'monthly') {
    if (referenceDate.getDate() < Math.max(goal.monthDay, 1)) return false;
    return !lastContribution || lastContribution.getFullYear() !== referenceDate.getFullYear() || lastContribution.getMonth() !== referenceDate.getMonth();
  }

  if (goal.frequency === 'weekly') {
    if (referenceDate.getDay() !== goal.weekday) return false;
    if (!lastContribution) return true;
    return startOfWeek(lastContribution).getTime() !== startOfWeek(referenceDate).getTime();
  }

  const anchor = lastContribution ?? new Date(goal.createdAt);
  if (Number.isNaN(anchor.getTime())) return false;
  return daysBetween(anchor, referenceDate) >= Math.max(goal.everyDays, 1);
}

export async function applyScheduledGoalContributions(referenceDate = new Date()): Promise<SavingsGoal[]> {
  const goals = await getSavingsGoals();
  const transactions = await getTransactions();
  const dueGoals = goals.filter((goal) => isScheduledContributionDue(goal, referenceDate));

  if (dueGoals.length === 0) return goals;

  let nextGoals = goals;
  for (const goal of dueGoals) {
    const amount = calculateGoalScheduledAmount(goal, referenceDate, transactions);
    if (amount <= 0) continue;
    nextGoals = await recordGoalContribution(goal.id, amount, {
      date: toISODate(referenceDate),
      createdAt: referenceDate.toISOString(),
      method: 'Aporte automático',
      note: `Aporte automático a meta: ${goal.title}`,
    });
  }

  return nextGoals;
}

export async function removeSavingsGoal(id: string): Promise<SavingsGoal[]> {
  const items = await getSavingsGoals();
  const next = items.filter((goal) => goal.id !== id);
  await saveSavingsGoals(next);
  return next;
}
