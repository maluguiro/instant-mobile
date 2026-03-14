import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';

export type GoalContributionMode = 'fixed' | 'percent' | 'manual';
export type GoalFrequency = 'monthly' | 'weekly' | 'everyX' | 'manual';

export type SavingsGoal = {
  id: string;
  title: string;
  target: number;
  saved: number;
  mode: GoalContributionMode;
  fixedAmount: number;
  percent: number;
  frequency: GoalFrequency;
  everyDays: number;
  monthDay: number;
  weekday: number;
  createdAt: string;
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
  return {
    ...defaultGoal,
    ...goal,
  };
}

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  const items = await getItem<SavingsGoal[]>(STORAGE_KEYS.savingsGoals, []);
  return items.map(normalizeGoal);
}

export async function saveSavingsGoals(items: SavingsGoal[]): Promise<void> {
  await setItem<SavingsGoal[]>(STORAGE_KEYS.savingsGoals, items);
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
  }));
}

export async function removeSavingsGoal(id: string): Promise<SavingsGoal[]> {
  const items = await getSavingsGoals();
  const next = items.filter((goal) => goal.id !== id);
  await saveSavingsGoals(next);
  return next;
}
