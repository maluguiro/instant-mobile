import { FinanceSettings } from '@/lib/finance-settings';
import { Transaction } from '@/lib/types';
import { getCachedAppSettings } from '@/lib/app-settings';

export function parseDateInput(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed || trimmed === 'hoy' || trimmed === 'today') {
    return toISODate(new Date());
  }

  const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const date = isoMatch ? new Date(trimmed + 'T00:00:00') : new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return toISODate(date);
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatCurrency(value: number, currency?: string): string {
  const resolvedCurrency = currency ?? getCachedAppSettings().currency ?? 'ARS';
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: resolvedCurrency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    const abs = Math.abs(value);
    const formatted = abs.toLocaleString('es-AR');
    return `${value < 0 ? '-' : ''}$${formatted}`;
  }
}

export function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

export function formatTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export function isSameMonth(date: Date, reference: Date): boolean {
  return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function isSavingsCategory(category: string): boolean {
  return category.trim().toLowerCase() === 'ahorro';
}

export function calculateTotals(transactions: Transaction[]) {
  let income = 0;
  let expense = 0;
  let savingsManual = 0;

  for (const tx of transactions) {
    if (isSavingsCategory(tx.category)) {
      savingsManual += Math.abs(tx.amount);
      continue;
    }

    if (tx.type === 'income') {
      income += tx.amount;
    } else {
      expense += tx.amount;
    }
  }

  return {
    income,
    expense,
    savingsManual,
  };
}

export function calculateSavingsReserved(
  totals: { income: number },
  settings: FinanceSettings
): number {
  if (settings.savingsMode === 'manual') {
    return 0;
  }

  if (settings.savingsMode === 'percent') {
    return Math.max(0, (totals.income * settings.savingsPercent) / 100);
  }

  const frequencyMultiplier =
    settings.savingsFrequency === 'weekly'
      ? 4
      : settings.savingsFrequency === 'everyX'
        ? 30 / Math.max(settings.savingsEveryDays, 1)
        : settings.savingsFrequency === 'manual'
          ? 0
          : 1;

  return Math.max(0, settings.savingsFixed * frequencyMultiplier);
}

export function calculateAvailable(
  totals: { income: number; expense: number; savingsManual: number },
  settings: FinanceSettings
) {
  const savingsReserved = calculateSavingsReserved(totals, settings);
  const savingsTotal = savingsReserved + totals.savingsManual;
  const available = totals.income - totals.expense - savingsTotal;

  return {
    savingsReserved,
    savingsTotal,
    available,
  };
}

export function getWeeklyPlanAmount(settings: FinanceSettings, monthlyAvailable: number) {
  if (settings.weeklyMode === 'auto') {
    return Math.max(monthlyAvailable / 4, 0);
  }
  if (settings.weeklyMode === 'manual') {
    return Math.max(settings.weeklyManualEnabledAmount, 0);
  }
  return Math.max(settings.weeklyAmount, 0);
}

export function filterByMonth(transactions: Transaction[], reference: Date): Transaction[] {
  return transactions.filter((tx) => {
    const date = new Date(tx.date + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return false;
    return isSameMonth(date, reference);
  });
}

export function filterByWeek(transactions: Transaction[], reference: Date): Transaction[] {
  const start = startOfWeek(reference);
  const end = endOfWeek(reference);
  return transactions.filter((tx) => {
    const date = new Date(tx.date + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return false;
    return date >= start && date <= end;
  });
}

export function groupByDate(transactions: Transaction[]) {
  const groups = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const list = groups.get(tx.date) ?? [];
    list.push(tx);
    groups.set(tx.date, list);
  }

  const sortedDates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));
  return sortedDates.map((date) => ({
    date,
    items: groups.get(date) ?? [],
  }));
}

export function summarizeByCategory(transactions: Transaction[]) {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== 'expense' || isSavingsCategory(tx.category)) continue;
    map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount);
  }
  return Array.from(map.entries()).map(([category, amount]) => ({ category, amount }));
}
