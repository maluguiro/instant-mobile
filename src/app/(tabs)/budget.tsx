
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, LayoutAnimation, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { CurrencySelect } from '@/components/ui/currency-select';
import { Pill } from '@/components/ui/pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SelectableOption } from '@/components/ui/selectable-option';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Spacing } from '@/constants/theme';
import { useFinanceSettings } from '@/hooks/use-finance-settings';
import { useTheme } from '@/hooks/use-theme';
import { useDuo } from '@/hooks/use-duo';
import { useAppSettings } from '@/hooks/use-app-settings';
import { useTransactions } from '@/hooks/use-transactions';
import {
  calculateAvailable,
  calculateSavingsReserved,
  calculateTotals,
  filterByCurrency,
  filterByMonth,
  formatCurrency,
  getTransactionCurrency,
  hasOtherCurrencies,
  startOfWeek,
  toMonthKey,
  toISODate,
} from '@/lib/finance';
import { defaultFinanceSettings, SavingsFrequency, WeeklyRenewalMode } from '@/lib/finance-settings';
import { ensureWeeklyRenewal } from '@/lib/weekly-renewal';
import { addTransaction, deleteTransaction, getTransactions } from '@/lib/transactions';
import {
  addSavingsGoal,
  contributeToGoal,
  GoalContributionMode,
  GoalFrequency,
  getSavingsGoals,
  updateSavingsGoal,
  removeSavingsGoal,
  SavingsGoal,
} from '@/lib/goals';

const TABS = ['Ahorro', 'Semanal', 'Metas'] as const;
type Tab = (typeof TABS)[number];

const WEEK_DAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

const WEEK_DAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

function parseAmount(value: string): number {
  const cleaned = value.replace(/[^0-9,.-]/g, '');
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatFrequency(frequency: GoalFrequency | SavingsFrequency, everyDays: number) {
  if (frequency === 'weekly') return 'semanal';
  if (frequency === 'everyX') return `cada ${Math.max(everyDays, 1)} días`;
  if (frequency === 'manual') return 'manual';
  return 'mensual';
}

function formatSavingsSchedule(
  frequency: SavingsFrequency | GoalFrequency,
  monthDay: number,
  weekday: number,
  everyDays: number
) {
  if (frequency === 'weekly') {
    return `cada ${WEEK_DAY_LABELS[weekday] ?? 'semana'}`;
  }
  if (frequency === 'everyX') {
    return `cada ${Math.max(everyDays, 1)} días`;
  }
  if (frequency === 'manual') {
    return 'reserva manual';
  }
  return `el día ${Math.max(monthDay, 1)} de cada mes`;
}

function formatWeeklyRenewal(
  renewal: WeeklyRenewalMode,
  customDay: number,
  everyDays: number
) {
  if (renewal === 'custom') return `cada ${WEEK_DAY_LABELS[customDay] ?? 'día'}`;
  if (renewal === 'everyX') return `cada ${Math.max(everyDays, 1)} días`;
  if (renewal === 'manual') return 'manual';
  return 'cada lunes';
}

function formatGoalPlan(goal: SavingsGoal) {
  const schedule = formatSavingsSchedule(
    goal.frequency,
    goal.monthDay,
    goal.weekday,
    goal.everyDays
  );
  if (goal.mode === 'manual' || goal.frequency === 'manual') {
    return 'Aportes manuales';
  }
  if (goal.mode === 'percent') {
    return `${goal.percent}% ${schedule}`;
  }
  return `${formatCurrency(goal.fixedAmount, goal.currency)} ${schedule}`;
}

export default function BudgetScreen() {
  const theme = useTheme();
  const { state: duoState } = useDuo();
  const { settings: appSettings } = useAppSettings();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { settings, refresh, update } = useFinanceSettings();
  const { transactions, refresh: refreshTransactions, add } = useTransactions();

  const [activeTab, setActiveTab] = useState<Tab>('Ahorro');

  const [savingsMode, setSavingsMode] = useState(settings.savingsMode);
  const [savingsFixed, setSavingsFixed] = useState(String(settings.savingsFixed));
  const [savingsPercent, setSavingsPercent] = useState(String(settings.savingsPercent));
  const [savingsFrequency, setSavingsFrequency] = useState(settings.savingsFrequency);
  const [savingsEveryDays, setSavingsEveryDays] = useState(String(settings.savingsEveryDays));
  const [savingsMonthDay, setSavingsMonthDay] = useState(String(settings.savingsMonthDay));
  const [savingsWeekday, setSavingsWeekday] = useState(settings.savingsWeekday);
  const [savingsManualAmount, setSavingsManualAmount] = useState('');
  const [savingsCurrency, setSavingsCurrency] = useState(settings.savingsCurrency);

  const [weeklyMode, setWeeklyMode] = useState(settings.weeklyMode);
  const [weeklyAmount, setWeeklyAmount] = useState(String(settings.weeklyAmount));
  const [weeklyRenewal, setWeeklyRenewal] = useState<WeeklyRenewalMode>(settings.weeklyRenewal);
  const [weeklyCustomDay, setWeeklyCustomDay] = useState(settings.weeklyCustomDay);
  const [weeklyEveryDays, setWeeklyEveryDays] = useState(String(settings.weeklyEveryDays));
  const [weeklyManualAmount, setWeeklyManualAmount] = useState('');
  const [weeklyRolloverMode, setWeeklyRolloverMode] = useState(settings.weeklyRolloverMode);
  const [weeklyRolloverGoalId, setWeeklyRolloverGoalId] = useState(settings.weeklyRolloverGoalId ?? '');

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalSaved, setGoalSaved] = useState('');
  const [goalMode, setGoalMode] = useState<GoalContributionMode>('fixed');
  const [goalFixedAmount, setGoalFixedAmount] = useState('');
  const [goalPercent, setGoalPercent] = useState('');
  const [goalFrequency, setGoalFrequency] = useState<GoalFrequency>('monthly');
  const [goalEveryDays, setGoalEveryDays] = useState('30');
  const [goalMonthDay, setGoalMonthDay] = useState('1');
  const [goalWeekday, setGoalWeekday] = useState(1);
  const [goalCurrency, setGoalCurrency] = useState(appSettings.currency);
  const [goalContribution, setGoalContribution] = useState<Record<string, string>>({});
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalEditDone, setGoalEditDone] = useState(false);
  const [goalSummaryIndex, setGoalSummaryIndex] = useState(0);
  const [goalSummaryWidth, setGoalSummaryWidth] = useState(0);
  const goalSummaryRef = useRef<ScrollView>(null);

  const [savePlanDone, setSavePlanDone] = useState(false);
  const [goalAddedDone, setGoalAddedDone] = useState(false);
  const [manualSavingsDone, setManualSavingsDone] = useState(false);
  const [weeklyManualDone, setWeeklyManualDone] = useState(false);
  const [goalContributionDone, setGoalContributionDone] = useState<Record<string, boolean>>({});

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const run = async () => {
        refresh();
        await refreshTransactions();
        await ensureWeeklyRenewal(null, appSettings.currency);
        await refreshTransactions();
        const loadedGoals = await getSavingsGoals();
        if (active) setGoals(loadedGoals);
      };
      run();
      return () => {
        active = false;
      };
    }, [refresh, refreshTransactions, appSettings.currency, duoState.activeContext, duoState.duoId])
  );

  useEffect(() => {
    setSavingsMode(settings.savingsMode);
    setSavingsFixed(String(settings.savingsFixed));
    setSavingsPercent(String(settings.savingsPercent));
    setSavingsFrequency(settings.savingsFrequency);
    setSavingsEveryDays(String(settings.savingsEveryDays));
    setSavingsMonthDay(String(settings.savingsMonthDay));
    setSavingsWeekday(settings.savingsWeekday);
    setSavingsCurrency(settings.savingsCurrency);
    setWeeklyMode(settings.weeklyMode === 'auto' ? 'fixed' : settings.weeklyMode);
    setWeeklyAmount(String(settings.weeklyAmount));
    setWeeklyRenewal(settings.weeklyRenewal);
    setWeeklyCustomDay(settings.weeklyCustomDay);
    setWeeklyEveryDays(String(settings.weeklyEveryDays));
    setWeeklyRolloverMode(settings.weeklyRolloverMode);
    setWeeklyRolloverGoalId(settings.weeklyRolloverGoalId ?? '');
  }, [settings]);

  useEffect(() => {
    setGoalCurrency(appSettings.currency);
  }, [appSettings.currency]);

  useEffect(() => {
    const tabParam = params.tab;
    if (typeof tabParam === 'string' && TABS.includes(tabParam as Tab)) {
      setActiveTab(tabParam as Tab);
    }
  }, [params.tab]);

  useEffect(() => {
    if (goalSummaryWidth > 0) {
      goalSummaryRef.current?.scrollTo({
        x: goalSummaryIndex * goalSummaryWidth,
        animated: true,
      });
    }
  }, [goalSummaryIndex, goalSummaryWidth]);

  const appCurrency = appSettings.currency;
  const safeGoals = Array.isArray(goals) ? goals : [];
  const monthTransactions = useMemo(
    () => filterByMonth(transactions, new Date()),
    [transactions]
  );
  const monthCurrencyTransactions = useMemo(
    () => filterByCurrency(monthTransactions, appCurrency),
    [monthTransactions, appCurrency]
  );
  const savingsCurrencyTransactions = useMemo(
    () => filterByCurrency(monthTransactions, settings.savingsCurrency),
    [monthTransactions, settings.savingsCurrency]
  );
  const currencyTransactions = useMemo(
    () => filterByCurrency(transactions, appCurrency),
    [transactions, appCurrency]
  );
  const latestWeeklyRenewal = useMemo(() => {
    const candidates = currencyTransactions.filter(
      (tx) => tx.system === 'weekly-renewal' || tx.category === 'Renovación semanal'
    );
    if (candidates.length === 0) return null;
    return candidates.reduce((latest, current) => {
      if (current.date > latest.date) return current;
      if (current.date === latest.date && (current.createdAt ?? '') > (latest.createdAt ?? '')) {
        return current;
      }
      return latest;
    }, candidates[0]);
  }, [currencyTransactions]);

  const weeklyCycleStart = useMemo(() => {
    if (latestWeeklyRenewal?.date) {
      return latestWeeklyRenewal.date;
    }
    if (settings.weeklyLastRenewedAt) {
      return settings.weeklyLastRenewedAt.slice(0, 10);
    }
    return toISODate(startOfWeek(new Date()));
  }, [latestWeeklyRenewal, settings.weeklyLastRenewedAt]);
  const hasOtherCurrencyTransactions = useMemo(
    () => hasOtherCurrencies(monthTransactions, appCurrency),
    [monthTransactions, appCurrency]
  );

  const totals = useMemo(
    () => calculateTotals(monthCurrencyTransactions, appCurrency),
    [monthCurrencyTransactions, appCurrency]
  );
  const monthAvailable = useMemo(
    () => calculateAvailable(totals, settings, appCurrency, monthCurrencyTransactions, new Date()),
    [totals, settings, appCurrency, monthCurrencyTransactions]
  );

  const weeklyEnabled = useMemo(() => {
    if (settings.weeklyMode === 'manual') {
      return Math.max(settings.weeklyManualEnabledAmount, 0);
    }
    return latestWeeklyRenewal?.amount ?? 0;
  }, [settings.weeklyMode, settings.weeklyManualEnabledAmount, latestWeeklyRenewal]);

  const weeklyUsed = useMemo(
    () =>
      currencyTransactions.reduce((acc, tx) => {
        if (!tx.weekly || tx.type !== 'expense') return acc;
        if (tx.date < weeklyCycleStart) return acc;
        return acc + tx.amount;
      }, 0),
    [currencyTransactions, weeklyCycleStart]
  );

  const weeklyRemaining = Math.max(weeklyEnabled - weeklyUsed, 0);

  const savingsScheduledAmount = useMemo(() => {
    if (settings.savingsMode === 'manual') return 0;
    if (settings.savingsMode === 'percent') {
      const totalsForSavings = calculateTotals(savingsCurrencyTransactions, settings.savingsCurrency);
      return Math.max(0, (totalsForSavings.income * settings.savingsPercent) / 100);
    }
    return Math.max(settings.savingsFixed, 0);
  }, [settings.savingsMode, settings.savingsPercent, settings.savingsFixed, savingsCurrencyTransactions, settings.savingsCurrency]);

  const savingsSuggested = useMemo(() => {
    if (savingsMode === 'percent') {
      return Math.max(0, (totals.income * (parseAmount(savingsPercent) || 0)) / 100);
    }
    if (savingsMode === 'fixed') {
      return Math.max(parseAmount(savingsFixed), 0);
    }
    return 0;
  }, [savingsMode, savingsPercent, savingsFixed, totals.income]);

  useEffect(() => {
    if (savingsFrequency === 'manual') {
      setSavingsManualAmount((prev) =>
        prev.trim() ? prev : savingsSuggested > 0 ? String(Math.round(savingsSuggested)) : ''
      );
    }
  }, [savingsFrequency, savingsSuggested]);

  useEffect(() => {
    if (weeklyRenewal === 'manual') {
      setWeeklyManualAmount((prev) =>
        prev.trim() ? prev : parseAmount(weeklyAmount) > 0 ? weeklyAmount : ''
      );
    }
  }, [weeklyRenewal, weeklyAmount]);

  const savingsSummary = useMemo(() => {
    const schedule = formatSavingsSchedule(
      savingsFrequency,
      parseAmount(savingsMonthDay),
      savingsWeekday,
      parseAmount(savingsEveryDays)
    );
    if (savingsMode === 'manual' || savingsFrequency === 'manual') {
      return 'Reserva manual';
    }
    if (savingsMode === 'percent') {
      return `Se reservará el ${parseAmount(savingsPercent) || 0}% de tus ingresos ${schedule}`;
    }
    return `Se reservarán ${formatCurrency(parseAmount(savingsFixed) || 0, savingsCurrency)} ${schedule}`;
  }, [
    savingsMode,
    savingsFixed,
    savingsPercent,
    savingsFrequency,
    savingsEveryDays,
    savingsMonthDay,
    savingsWeekday,
    savingsCurrency,
  ]);

  const weeklySummary = useMemo(() => {
    if (weeklyMode === 'manual') {
      return 'Plan manual con habilitación puntual.';
    }
    return `Plan semanal de ${formatCurrency(parseAmount(weeklyAmount) || 0, appCurrency)}.`;
  }, [weeklyMode, weeklyAmount, appCurrency]);

  const goalSummaryData = useMemo(() => {
    const currencies = Array.from(
      new Set(safeGoals.map((goal) => goal.currency ?? appCurrency))
    );
    const normalizedCurrencies =
      currencies.length > 0
        ? currencies.includes(appCurrency)
          ? [
              appCurrency,
              ...currencies.filter((currency) => currency !== appCurrency),
            ]
          : currencies
        : [appCurrency];

    return normalizedCurrencies.map((currency) => {
      const items = safeGoals.filter((goal) => goal.currency === currency);
      const totalTarget = items.reduce((acc, goal) => acc + goal.target, 0);
      const totalSaved = items.reduce((acc, goal) => acc + goal.saved, 0);
      return {
        currency,
        count: items.length,
        totalTarget,
        totalSaved,
      };
    });
  }, [safeGoals, appCurrency]);

  const safeGoalSummaryData = Array.isArray(goalSummaryData) ? goalSummaryData : [];
  const goalSummaryCount = safeGoalSummaryData.length;
  const goalsCount = goalsCount;

  useEffect(() => {
    if (goalSummaryIndex >= goalSummaryCount) {
      setGoalSummaryIndex(0);
    }
  }, [goalSummaryIndex, goalSummaryCount]);

  const editingGoal = useMemo(
    () => safeGoals.find((goal) => goal.id === editingGoalId) ?? null,
    [safeGoals, editingGoalId]
  );

  const goalSchedulePreview = useMemo(
    () =>
      formatSavingsSchedule(
        goalFrequency,
        parseAmount(goalMonthDay),
        goalWeekday,
        parseAmount(goalEveryDays)
      ),
    [goalFrequency, goalMonthDay, goalWeekday, goalEveryDays]
  );

  const handleSavePlan = async () => {
    const fixed = Math.max(parseAmount(savingsFixed), 0);
    const percent = Math.max(parseAmount(savingsPercent), 0);
    const weekly = Math.max(parseAmount(weeklyAmount), 0);
    const everyDays = Math.max(parseAmount(savingsEveryDays), 1);
    const weeklyEvery = Math.max(parseAmount(weeklyEveryDays), 1);
    const nextSavingsMonthDay = Math.max(parseAmount(savingsMonthDay), 1);
    const shouldResetSavingsSkip =
      settings.savingsMode !== savingsMode ||
      settings.savingsFixed !== fixed ||
      settings.savingsPercent !== percent ||
      settings.savingsFrequency !== savingsFrequency ||
      settings.savingsEveryDays !== everyDays ||
      settings.savingsMonthDay !== nextSavingsMonthDay ||
      settings.savingsWeekday !== savingsWeekday ||
      settings.savingsCurrency !== savingsCurrency ||
      savingsFrequency !== 'monthly' ||
      savingsMode === 'manual';
    const shouldResetWeekly =
      settings.weeklyAmount !== weekly ||
      settings.weeklyMode !== weeklyMode ||
      settings.weeklyRenewal !== weeklyRenewal ||
      settings.weeklyCustomDay !== weeklyCustomDay ||
      settings.weeklyEveryDays !== weeklyEvery ||
      weeklyMode === 'manual' ||
      weekly <= 0;

    const nextSettings = {
      ...settings,
      savingsMode,
      savingsFixed: fixed,
      savingsPercent: percent,
      savingsFrequency,
      savingsEveryDays: everyDays,
      savingsMonthDay: nextSavingsMonthDay,
      savingsWeekday,
      savingsCurrency,
      savingsSkipMonth: shouldResetSavingsSkip ? null : settings.savingsSkipMonth,
      weeklyMode,
      weeklyAmount: weekly,
      weeklyRenewal,
      weeklyCustomDay,
      weeklyEveryDays: weeklyEvery,
      weeklyRolloverMode,
      weeklyRolloverGoalId: weeklyRolloverMode === 'goal' ? weeklyRolloverGoalId || undefined : undefined,
      weeklyLastRenewedAt: shouldResetWeekly ? null : settings.weeklyLastRenewedAt,
      weeklyLastRenewalAmount: shouldResetWeekly ? 0 : settings.weeklyLastRenewalAmount,
    };

    await update(nextSettings);

    await ensureWeeklyRenewal(null, appCurrency);
    await refreshTransactions();
    const latestTransactions = await getTransactions();

    const monthKey = toMonthKey(new Date());
    const dueDay = Math.max(nextSavingsMonthDay, 1);
    const today = new Date();
    const savingsCurrencyTx = filterByCurrency(monthTransactions, savingsCurrency);
    const totalsForSavings = calculateTotals(savingsCurrencyTx, savingsCurrency);
    const savingsScheduledAmountNext =
      savingsMode === 'manual'
        ? 0
        : savingsMode === 'percent'
          ? Math.max(0, (totalsForSavings.income * percent) / 100)
          : Math.max(fixed, 0);
    const hasSavingsRenewal = transactions.some((tx) => {
      if (tx.system !== 'savings-renewal') return false;
      if (getTransactionCurrency(tx, savingsCurrency) !== savingsCurrency) return false;
      return tx.date.startsWith(monthKey);
    });
    const shouldPromptSavings =
      savingsMode !== 'manual' &&
      savingsFrequency === 'monthly' &&
      savingsScheduledAmountNext > 0 &&
      today.getDate() >= dueDay &&
      nextSettings.savingsSkipMonth !== monthKey &&
      !hasSavingsRenewal;

    const savingsRenewals = latestTransactions
      .filter((tx) => {
        if (tx.system !== 'savings-renewal') return false;
        if (getTransactionCurrency(tx, savingsCurrency) !== savingsCurrency) return false;
        return tx.date.startsWith(monthKey);
      })
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    if (savingsRenewals.length > 1) {
      await Promise.all(savingsRenewals.slice(1).map((tx) => deleteTransaction(tx.id)));
    }

    if (shouldPromptSavings) {
      const message =
        `El ahorro estaba programado para el día ${dueDay} de este mes.\n` +
        `¿Querés reservarlo ahora o esperar al mes próximo?`;
      Alert.alert('Ahorro programado', message, [
        {
          text: 'Esperar al mes próximo',
          style: 'cancel',
          onPress: async () => {
            await update({ ...nextSettings, savingsSkipMonth: monthKey });
          },
        },
        {
          text: 'Reservar ahora',
          onPress: async () => {
            const now = new Date();
            await addTransaction(
              {
                id: String(Date.now()),
                type: 'expense',
                amount: Math.round(savingsScheduledAmountNext),
                currency: savingsCurrency,
                category: 'Ahorro',
                date: toISODate(now),
                method: 'Ahorro programado',
                note: 'Ahorro programado',
                createdAt: now.toISOString(),
              },
              { system: 'savings-renewal' }
            );
            await update({ ...nextSettings, savingsSkipMonth: null });
          },
        },
      ]);
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSavePlanDone(true);
    setTimeout(() => setSavePlanDone(false), 1400);
  };

  const handleManualSavings = async () => {
    const amount = Math.max(parseAmount(savingsManualAmount), 0);
    if (!amount) return;
    await add({
      id: String(Date.now()),
      type: 'expense',
      amount,
      currency: savingsCurrency,
      category: 'Ahorro',
      date: toISODate(new Date()),
      method: 'Ahorro',
      createdAt: new Date().toISOString(),
    });
    setSavingsManualAmount('');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setManualSavingsDone(true);
    setTimeout(() => setManualSavingsDone(false), 1400);
  };

  const handleManualWeeklyEnable = async () => {
    const amount = Math.max(parseAmount(weeklyManualAmount), 0);
    if (!amount) return;
    await update({
      ...settings,
      weeklyManualEnabledAmount: amount,
      weeklyManualEnabledAt: new Date().toISOString(),
    });
    setWeeklyManualAmount('');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setWeeklyManualDone(true);
    setTimeout(() => setWeeklyManualDone(false), 1400);
  };

  const resetGoalForm = useCallback(() => {
    setGoalTitle('');
    setGoalTarget('');
    setGoalSaved('');
    setGoalFixedAmount('');
    setGoalPercent('');
    setGoalEveryDays('30');
    setGoalMonthDay('1');
    setGoalWeekday(1);
    setGoalMode('fixed');
    setGoalFrequency('monthly');
    setGoalCurrency(appSettings.currency);
    setEditingGoalId(null);
  }, [appSettings.currency]);

  const handleEditGoal = useCallback((goal: SavingsGoal) => {
    setEditingGoalId(goal.id);
    setGoalTitle(goal.title);
    setGoalTarget(String(goal.target));
    setGoalSaved(String(goal.saved));
    setGoalCurrency(goal.currency);
    setGoalMode(goal.mode);
    setGoalFixedAmount(String(goal.fixedAmount));
    setGoalPercent(String(goal.percent));
    setGoalFrequency(goal.frequency);
    setGoalEveryDays(String(goal.everyDays));
    setGoalMonthDay(String(goal.monthDay));
    setGoalWeekday(goal.weekday);
  }, []);

  const handleSaveGoal = async () => {
    const title = goalTitle.trim();
    const target = Math.max(parseAmount(goalTarget), 0);
    const savedInput = Math.max(parseAmount(goalSaved), 0);
    const saved =
      editingGoalId && goalSaved.trim() === '' ? editingGoal?.saved ?? 0 : savedInput;
    if (!title || !target) {
      Alert.alert('Completá la meta', 'Agregá un nombre y un monto objetivo válido.');
      return;
    }

    const payload = {
      title,
      target,
      saved,
      currency: goalCurrency,
      mode: goalMode,
      fixedAmount: Math.max(parseAmount(goalFixedAmount), 0),
      percent: Math.max(parseAmount(goalPercent), 0),
      frequency: goalFrequency,
      everyDays: Math.max(parseAmount(goalEveryDays), 1),
      monthDay: Math.max(parseAmount(goalMonthDay), 1),
      weekday: goalWeekday,
    };

    if (editingGoalId) {
      const next = await updateSavingsGoal(editingGoalId, (goal) => ({
        ...goal,
        ...payload,
      }));
      setGoals(next);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setGoalEditDone(true);
      setTimeout(() => setGoalEditDone(false), 1400);
      resetGoalForm();
      return;
    }

    const goal: SavingsGoal = {
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      ...payload,
    };

    const next = await addSavingsGoal(goal);
    setGoals(next);
    resetGoalForm();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setGoalAddedDone(true);
    setTimeout(() => setGoalAddedDone(false), 1400);
  };

  const handleContributeToGoal = async (goalId: string) => {
    const amount = Math.max(parseAmount(goalContribution[goalId] ?? ''), 0);
    if (!amount) return;
    const next = await contributeToGoal(goalId, amount);
    setGoals(next);
    setGoalContribution((prev) => ({ ...prev, [goalId]: '' }));
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setGoalContributionDone((prev) => ({ ...prev, [goalId]: true }));
    setTimeout(
      () => setGoalContributionDone((prev) => ({ ...prev, [goalId]: false })),
      1400
    );
  };

  const handleClearSavings = () => {
    Alert.alert('Borrar ahorro', '¿Querés eliminar la configuración de ahorro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await update({
            ...settings,
            savingsMode: defaultFinanceSettings.savingsMode,
            savingsFixed: defaultFinanceSettings.savingsFixed,
            savingsPercent: defaultFinanceSettings.savingsPercent,
            savingsFrequency: defaultFinanceSettings.savingsFrequency,
            savingsEveryDays: defaultFinanceSettings.savingsEveryDays,
            savingsMonthDay: defaultFinanceSettings.savingsMonthDay,
            savingsWeekday: defaultFinanceSettings.savingsWeekday,
          });
        },
      },
    ]);
  };

  const handleClearWeekly = () => {
    Alert.alert('Borrar plan semanal', '¿Querés eliminar el plan semanal configurado?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          const systemWeekly = transactions.filter(
            (tx) =>
              tx.system === 'weekly-renewal' ||
              tx.system === 'weekly-rollover' ||
              tx.category === 'Renovación semanal'
          );
          if (systemWeekly.length > 0) {
            await Promise.all(systemWeekly.map((tx) => deleteTransaction(tx.id)));
          }
          await update({
            ...settings,
            weeklyMode: defaultFinanceSettings.weeklyMode,
            weeklyAmount: defaultFinanceSettings.weeklyAmount,
            weeklyRenewal: defaultFinanceSettings.weeklyRenewal,
            weeklyCustomDay: defaultFinanceSettings.weeklyCustomDay,
            weeklyEveryDays: defaultFinanceSettings.weeklyEveryDays,
            weeklyManualEnabledAmount: defaultFinanceSettings.weeklyManualEnabledAmount,
            weeklyManualEnabledAt: defaultFinanceSettings.weeklyManualEnabledAt,
            weeklyLastRenewedAt: defaultFinanceSettings.weeklyLastRenewedAt,
            weeklyLastRenewalAmount: defaultFinanceSettings.weeklyLastRenewalAmount,
            weeklyRolloverMode: defaultFinanceSettings.weeklyRolloverMode,
            weeklyRolloverGoalId: defaultFinanceSettings.weeklyRolloverGoalId,
          });
          await refreshTransactions();
        },
      },
    ]);
  };

  const handleRemoveGoal = (goalId: string) => {
    Alert.alert('Eliminar meta', '¿Querés borrar esta meta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          const next = await removeSavingsGoal(goalId);
          setGoals(next);
        },
      },
    ]);
  };

  const savingsTarget = calculateSavingsReserved(totals, settings);
  const savingsProgressTarget = savingsTarget > 0 ? savingsTarget : monthAvailable.savingsTotal;
  const savingsProgressValue =
    savingsProgressTarget > 0 ? monthAvailable.savingsTotal / savingsProgressTarget : 0;
  const savePlanColor = savePlanDone ? theme.brandSoft : theme.brand;
  const savePlanTextColor = savePlanDone ? theme.text : theme.onBrand;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <ThemedText type="subtitle">Presupuesto</ThemedText>
          <ThemeToggle />
        </View>
        <ThemedText themeColor="textSecondary">
          Organizá tu plan financiero con calma y claridad.
        </ThemedText>
      </View>

      <Card>
        <SectionHeader title="Planificación" />
        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <SelectableOption
              key={tab}
              label={tab}
              selected={activeTab === tab}
              onPress={() => setActiveTab(tab)}
            />
          ))}
        </View>
        {hasOtherCurrencyTransactions ? (
          <ThemedText type="small" themeColor="textSecondary">
            Totales calculados en {appCurrency}. Hay movimientos en otras monedas.
          </ThemedText>
        ) : null}

        {activeTab === 'Ahorro' ? (
          <View style={styles.sectionBody}>
            <Card variant="soft" style={styles.innerCard}>
              <SectionHeader title="Modo de ahorro" />
              <View style={styles.optionRow}>
                <SelectableOption
                  label="Monto fijo"
                  selected={savingsMode === 'fixed'}
                  onPress={() => setSavingsMode('fixed')}
                />
                <SelectableOption
                  label="Porcentaje"
                  selected={savingsMode === 'percent'}
                  onPress={() => setSavingsMode('percent')}
                />
                <SelectableOption
                  label="Manual"
                  selected={savingsMode === 'manual'}
                  onPress={() => setSavingsMode('manual')}
                />
              </View>
              {savingsMode === 'fixed' ? (
                <View style={styles.inlineAmountRow}>
                  <TextInput
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, styles.inlineInput, { color: theme.text, borderColor: theme.border }]}
                    value={savingsFixed}
                    onChangeText={setSavingsFixed}
                    keyboardType="numeric"
                  />
                  <CurrencySelect
                    value={savingsCurrency}
                    onChange={setSavingsCurrency}
                    compact
                    style={styles.inlineCurrency}
                    label=""
                  />
                </View>
              ) : null}
              {savingsMode === 'percent' ? (
                <TextInput
                  placeholder="0%"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={savingsPercent}
                  onChangeText={setSavingsPercent}
                  keyboardType="numeric"
                />
              ) : null}
              {savingsMode === 'manual' ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Vas a reservar ahorro cuando lo decidas.
                </ThemedText>
              ) : null}
              {savingsMode !== 'fixed' ? (
                <View style={styles.currencyRow}>
                  <CurrencySelect value={savingsCurrency} onChange={setSavingsCurrency} compact label="" />
                  <ThemedText type="small" themeColor="textSecondary">
                    Moneda del ahorro
                  </ThemedText>
                </View>
              ) : null}
            </Card>

            <Card variant="soft" style={styles.innerCard}>
              <SectionHeader title="Frecuencia" />
              <View style={styles.optionRow}>
                <SelectableOption
                  label="Mensual"
                  selected={savingsFrequency === 'monthly'}
                  onPress={() => setSavingsFrequency('monthly')}
                />
                <SelectableOption
                  label="Semanal"
                  selected={savingsFrequency === 'weekly'}
                  onPress={() => setSavingsFrequency('weekly')}
                />
                <SelectableOption
                  label="Cada X días"
                  selected={savingsFrequency === 'everyX'}
                  onPress={() => setSavingsFrequency('everyX')}
                />
                <SelectableOption
                  label="Manual"
                  selected={savingsFrequency === 'manual'}
                  onPress={() => setSavingsFrequency('manual')}
                />
              </View>
              {savingsFrequency === 'monthly' ? (
                <TextInput
                  placeholder="Día del mes (1-31)"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={savingsMonthDay}
                  onChangeText={setSavingsMonthDay}
                  keyboardType="numeric"
                />
              ) : null}
              {savingsFrequency === 'weekly' ? (
                <View style={styles.daysRow}>
                  {WEEK_DAYS.map((day) => (
                    <SelectableOption
                      key={day.value}
                      label={day.label}
                      selected={savingsWeekday === day.value}
                      onPress={() => setSavingsWeekday(day.value)}
                    />
                  ))}
                </View>
              ) : null}
              {savingsFrequency === 'everyX' ? (
                <TextInput
                  placeholder="Cada 30 días"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={savingsEveryDays}
                  onChangeText={setSavingsEveryDays}
                  keyboardType="numeric"
                />
              ) : null}
              {savingsFrequency === 'manual' ? (
                <View style={styles.manualAction}>
                  <ThemedText type="small" themeColor="textSecondary">
                    El ahorro no se debita automáticamente. Vos decidís cuándo reservarlo.
                  </ThemedText>
                  <TextInput
                    placeholder="Monto sugerido"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    value={savingsManualAmount}
                    onChangeText={setSavingsManualAmount}
                    keyboardType="numeric"
                  />
                  <Pressable
                    onPress={handleManualSavings}
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: theme.brand },
                      pressed && styles.buttonPressed,
                    ]}>
                      <ThemedText type="smallBold" style={[styles.saveText, { color: theme.onBrand }]}>
                        {manualSavingsDone ? 'Registrado' : 'Debitar para ahorro'}
                      </ThemedText>
                  </Pressable>
                </View>
              ) : null}
            </Card>

            <Card variant="soft" style={styles.summaryCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Resumen actual
              </ThemedText>
              <ThemedText type="smallBold">{savingsSummary}</ThemedText>
            </Card>

            <Card variant="soft" style={styles.summaryCard}>
              <View style={styles.progressHeader}>
                <ThemedText type="small" themeColor="textSecondary">
                  Progreso del ahorro
                </ThemedText>
                <ThemedText type="smallBold">
                  {formatCurrency(monthAvailable.savingsTotal, savingsCurrency)}
                </ThemedText>
              </View>
              <ProgressBar value={savingsProgressValue} />
                <ThemedText type="small" themeColor="textSecondary">
                  Reservado este período: {formatCurrency(monthAvailable.savingsReserved, savingsCurrency)}
                </ThemedText>
                {savingsCurrency !== appCurrency ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Ahorro en {savingsCurrency}. No se descuenta del disponible en {appCurrency}.
                  </ThemedText>
                ) : null}
              </Card>

            <Pressable
              onPress={handleClearSavings}
              style={({ pressed }) => [
                styles.outlineButton,
                { borderColor: theme.border },
                pressed && styles.buttonPressed,
              ]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Borrar ahorro
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {activeTab === 'Semanal' ? (
          <View style={styles.sectionBody}>
            <Card variant="soft" style={styles.innerCard}>
              <SectionHeader title="Modo semanal" />
              <View style={styles.optionRow}>
                <SelectableOption
                  label="Monto fijo"
                  selected={weeklyMode === 'fixed'}
                  onPress={() => setWeeklyMode('fixed')}
                />
                <SelectableOption
                  label="Manual"
                  selected={weeklyMode === 'manual'}
                  onPress={() => setWeeklyMode('manual')}
                />
              </View>
              {weeklyMode === 'fixed' ? (
                <TextInput
                  placeholder="$0"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={weeklyAmount}
                  onChangeText={setWeeklyAmount}
                  keyboardType="numeric"
                />
              ) : null}
              {weeklyMode === 'manual' ? (
                <ThemedText type="small" themeColor="textSecondary">
                  La app no habilita automáticamente el monto semanal. Vos decidís cuándo activarlo.
                </ThemedText>
              ) : null}
            </Card>

            <Card variant="soft" style={styles.innerCard}>
              <SectionHeader title="Renovación" />
              <View style={styles.optionRow}>
                <SelectableOption
                  label="Cada lunes"
                  selected={weeklyRenewal === 'monday'}
                  onPress={() => setWeeklyRenewal('monday')}
                />
                <SelectableOption
                  label="Día personalizado"
                  selected={weeklyRenewal === 'custom'}
                  onPress={() => setWeeklyRenewal('custom')}
                />
                <SelectableOption
                  label="Cada X días"
                  selected={weeklyRenewal === 'everyX'}
                  onPress={() => setWeeklyRenewal('everyX')}
                />
                <SelectableOption
                  label="Manual"
                  selected={weeklyRenewal === 'manual'}
                  onPress={() => setWeeklyRenewal('manual')}
                />
              </View>
              {weeklyRenewal === 'custom' ? (
                <View style={styles.daysRow}>
                  {WEEK_DAYS.map((day) => (
                    <SelectableOption
                      key={day.value}
                      label={day.label}
                      selected={weeklyCustomDay === day.value}
                      onPress={() => setWeeklyCustomDay(day.value)}
                    />
                  ))}
                </View>
              ) : null}
              {weeklyRenewal === 'everyX' ? (
                <TextInput
                  placeholder="Cada 7 días"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={weeklyEveryDays}
                  onChangeText={setWeeklyEveryDays}
                  keyboardType="numeric"
                />
              ) : null}
              {(weeklyRenewal === 'manual' || weeklyMode === 'manual') && (
                <View style={styles.manualAction}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Habilitá el disponible semanal cuando quieras usarlo.
                  </ThemedText>
                  <TextInput
                    placeholder="Monto a habilitar"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    value={weeklyManualAmount}
                    onChangeText={setWeeklyManualAmount}
                    keyboardType="numeric"
                  />
                  <Pressable
                    onPress={handleManualWeeklyEnable}
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: theme.brand },
                      pressed && styles.buttonPressed,
                    ]}>
                      <ThemedText type="smallBold" style={[styles.saveText, { color: theme.onBrand }]}>
                        {weeklyManualDone ? 'Habilitado' : 'Habilitar disponible semanal'}
                      </ThemedText>
                  </Pressable>
                </View>
              )}
            </Card>

            <Card variant="soft" style={styles.innerCard}>
              <SectionHeader title="Sobrante semanal" />
              <ThemedText type="small" themeColor="textSecondary">
                Qué hacer con lo que sobra al cerrar la semana.
              </ThemedText>
              <View style={styles.optionRow}>
                <SelectableOption
                  label="Mantener en semanal"
                  selected={weeklyRolloverMode === 'keep'}
                  onPress={() => setWeeklyRolloverMode('keep')}
                />
                <SelectableOption
                  label="Pasar a ahorros"
                  selected={weeklyRolloverMode === 'savings'}
                  onPress={() => setWeeklyRolloverMode('savings')}
                />
                <SelectableOption
                  label="Pasar a una meta"
                  selected={weeklyRolloverMode === 'goal'}
                  onPress={() => setWeeklyRolloverMode('goal')}
                />
              </View>
              {weeklyRolloverMode === 'goal' ? (
                <View style={styles.goalSelectRow}>
                  {safeGoals.filter((goal) => goal.currency === appCurrency).length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      No hay metas en {appCurrency}. Creá una meta para usar esta opción.
                    </ThemedText>
                  ) : (
                    safeGoals
                      .filter((goal) => goal.currency === appCurrency)
                      .map((goal) => (
                        <SelectableOption
                          key={goal.id}
                          label={goal.title}
                          selected={weeklyRolloverGoalId === goal.id}
                          onPress={() => setWeeklyRolloverGoalId(goal.id)}
                        />
                      ))
                  )}
                </View>
              ) : null}
            </Card>

            <Card variant="soft" style={styles.summaryCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Resumen actual
              </ThemedText>
              <ThemedText type="smallBold">{weeklySummary}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Renovación: {formatWeeklyRenewal(weeklyRenewal, weeklyCustomDay, parseAmount(weeklyEveryDays))}
              </ThemedText>
            </Card>

            <Card variant="soft" style={styles.summaryCard}>
              <View style={styles.progressHeader}>
                <ThemedText type="small" themeColor="textSecondary">
                  Disponible semanal
                </ThemedText>
                <ThemedText type="smallBold">{formatCurrency(weeklyEnabled, appCurrency)}</ThemedText>
              </View>
              <ProgressBar value={weeklyEnabled > 0 ? weeklyUsed / weeklyEnabled : 0} />
              <View style={styles.progressRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  Usado: {formatCurrency(weeklyUsed, appCurrency)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Restante: {formatCurrency(weeklyRemaining, appCurrency)}
                </ThemedText>
              </View>
            </Card>

            <Pressable
              onPress={handleClearWeekly}
              style={({ pressed }) => [
                styles.outlineButton,
                { borderColor: theme.border },
                pressed && styles.buttonPressed,
              ]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Borrar plan semanal
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {activeTab === 'Metas' ? (
          <View style={styles.sectionBody}>
            <Card variant="soft" style={styles.summaryCard}>
              <View
                style={styles.goalSummaryViewport}
                onLayout={(event) => {
                  setGoalSummaryWidth(event.nativeEvent.layout.width);
                }}>
                <ScrollView
                  ref={goalSummaryRef}
                  horizontal
                  pagingEnabled
                  decelerationRate="fast"
                  snapToAlignment="start"
                  snapToInterval={goalSummaryWidth || 1}
                  showsHorizontalScrollIndicator={false}
                  scrollEnabled={goalSummaryCount > 1}
                  contentContainerStyle={styles.goalSummaryContent}
                  onMomentumScrollEnd={(event) => {
                    if (!goalSummaryWidth) return;
                    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / goalSummaryWidth);
                    setGoalSummaryIndex(Math.max(0, Math.min(nextIndex, goalSummaryCount - 1)));
                  }}>
                  {safeGoalSummaryData.map((entry) => (
                    <View
                      key={entry.currency}
                      style={[styles.goalSummaryPage, { width: goalSummaryWidth || '100%' }]}>
                      <View style={styles.goalSummaryHeader}>
                        <ThemedText type="small" themeColor="textSecondary">
                          Resumen de metas
                        </ThemedText>
                        <View style={styles.summaryCurrencyHint}>
                          <Pill label={entry.currency} tone="accent" />
                          {goalSummaryCount > 1 ? (
                            <View style={styles.summaryDotRow}>
                              {safeGoalSummaryData.map((item, index) => (
                                <View
                                  key={item.currency}
                                  style={[
                                    styles.summaryDot,
                                    {
                                      backgroundColor:
                                        index === goalSummaryIndex ? theme.brand : theme.border,
                                    },
                                  ]}
                                />
                              ))}
                            </View>
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.goalSummaryRow}>
                        <View style={styles.goalSummaryItem}>
                          <ThemedText type="small" themeColor="textSecondary">
                            Metas activas
                          </ThemedText>
                          <ThemedText type="smallBold">{entry.count}</ThemedText>
                        </View>
                        <View style={styles.goalSummaryItem}>
                          <ThemedText type="small" themeColor="textSecondary">
                            Total asignado
                          </ThemedText>
                          <ThemedText type="smallBold">
                            {formatCurrency(entry.totalTarget, entry.currency)}
                          </ThemedText>
                        </View>
                        <View style={styles.goalSummaryItem}>
                          <ThemedText type="small" themeColor="textSecondary">
                            Ahorrado
                          </ThemedText>
                          <ThemedText type="smallBold">
                            {formatCurrency(entry.totalSaved, entry.currency)}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </Card>

            <View style={styles.goalsStack}>
              {goalsCount === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Todavía no creaste metas de ahorro.
                </ThemedText>
              ) : (
                safeGoals.map((goal) => (
                  <Card key={goal.id} variant="soft" style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                      <ThemedText type="smallBold">{goal.title}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatCurrency(goal.saved, goal.currency)} / {formatCurrency(goal.target, goal.currency)}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatGoalPlan(goal)}
                    </ThemedText>
                    {goal.currency !== appCurrency ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        Moneda: {goal.currency}
                      </ThemedText>
                    ) : null}
                    <ProgressBar value={goal.target ? goal.saved / goal.target : 0} />
                    {goal.mode === 'manual' || goal.frequency === 'manual' ? (
                      <View style={styles.goalAction}>
                        <TextInput
                          placeholder={`Monto a aportar (${goal.currency})`}
                          placeholderTextColor={theme.textSecondary}
                          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                          value={goalContribution[goal.id] ?? ''}
                          onChangeText={(value) =>
                            setGoalContribution((prev) => ({ ...prev, [goal.id]: value }))
                          }
                          keyboardType="numeric"
                        />
                        <Pressable
                          onPress={() => handleContributeToGoal(goal.id)}
                          style={({ pressed }) => [
                            styles.actionButton,
                            { backgroundColor: theme.brand },
                            pressed && styles.buttonPressed,
                          ]}>
                          <ThemedText type="smallBold" style={[styles.saveText, { color: theme.onBrand }]}>
                            {goalContributionDone[goal.id] ? 'Aporte listo' : 'Aportar a meta'}
                          </ThemedText>
                        </Pressable>
                      </View>
                    ) : null}
                    <View style={styles.goalActionsRow}>
                      <Pressable
                        onPress={() => handleEditGoal(goal)}
                        style={({ pressed }) => [
                          styles.outlineButton,
                          styles.goalActionButton,
                          { borderColor: theme.border },
                          pressed && styles.buttonPressed,
                        ]}>
                        <ThemedText type="smallBold" themeColor="textSecondary">
                          Editar
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => handleRemoveGoal(goal.id)}
                        style={({ pressed }) => [
                          styles.outlineButton,
                          styles.goalActionButton,
                          { borderColor: theme.border },
                          pressed && styles.buttonPressed,
                        ]}>
                        <ThemedText type="smallBold" themeColor="textSecondary">
                          Eliminar meta
                        </ThemedText>
                      </Pressable>
                    </View>
                  </Card>
                ))
              )}
            </View>

            <Card variant="soft" style={styles.goalForm}>
              <SectionHeader title="Agregar meta" />
              <TextInput
                placeholder="Nombre de la meta"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={goalTitle}
                onChangeText={setGoalTitle}
              />
              <View style={styles.inlineAmountRow}>
                <TextInput
                  placeholder="Monto objetivo"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, styles.inlineInput, { color: theme.text, borderColor: theme.border }]}
                  value={goalTarget}
                  onChangeText={setGoalTarget}
                  keyboardType="numeric"
                />
                <CurrencySelect
                  value={goalCurrency}
                  onChange={setGoalCurrency}
                  compact
                  style={styles.inlineCurrency}
                  label=""
                />
              </View>
              <TextInput
                placeholder="Monto actual (opcional)"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={goalSaved}
                onChangeText={setGoalSaved}
                keyboardType="numeric"
              />

              <View style={styles.separator} />

              <SectionHeader title="Modo de aporte" />
              <View style={styles.optionRow}>
                <SelectableOption
                  label="Monto fijo"
                  selected={goalMode === 'fixed'}
                  onPress={() => setGoalMode('fixed')}
                />
                <SelectableOption
                  label="Porcentaje"
                  selected={goalMode === 'percent'}
                  onPress={() => setGoalMode('percent')}
                />
                <SelectableOption
                  label="Manual"
                  selected={goalMode === 'manual'}
                  onPress={() => setGoalMode('manual')}
                />
              </View>
              {goalMode === 'fixed' ? (
                <TextInput
                  placeholder="$0"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={goalFixedAmount}
                  onChangeText={setGoalFixedAmount}
                  keyboardType="numeric"
                />
              ) : null}
              {goalMode === 'percent' ? (
                <TextInput
                  placeholder="0%"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={goalPercent}
                  onChangeText={setGoalPercent}
                  keyboardType="numeric"
                />
              ) : null}

              <SectionHeader title="Frecuencia" />
              <View style={styles.optionRow}>
                <SelectableOption
                  label="Mensual"
                  selected={goalFrequency === 'monthly'}
                  onPress={() => setGoalFrequency('monthly')}
                />
                <SelectableOption
                  label="Semanal"
                  selected={goalFrequency === 'weekly'}
                  onPress={() => setGoalFrequency('weekly')}
                />
                <SelectableOption
                  label="Cada X días"
                  selected={goalFrequency === 'everyX'}
                  onPress={() => setGoalFrequency('everyX')}
                />
                <SelectableOption
                  label="Manual"
                  selected={goalFrequency === 'manual'}
                  onPress={() => setGoalFrequency('manual')}
                />
              </View>
              {goalFrequency === 'monthly' ? (
                <TextInput
                  placeholder="Día del mes (1-31)"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={goalMonthDay}
                  onChangeText={setGoalMonthDay}
                  keyboardType="numeric"
                />
              ) : null}
              {goalFrequency === 'weekly' ? (
                <View style={styles.daysRow}>
                  {WEEK_DAYS.map((day) => (
                    <SelectableOption
                      key={day.value}
                      label={day.label}
                      selected={goalWeekday === day.value}
                      onPress={() => setGoalWeekday(day.value)}
                    />
                  ))}
                </View>
              ) : null}
              {goalFrequency === 'everyX' ? (
                <TextInput
                  placeholder="Cada 30 días"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={goalEveryDays}
                  onChangeText={setGoalEveryDays}
                  keyboardType="numeric"
                />
              ) : null}

              <Card variant="soft" style={styles.summaryCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  Resumen del plan
                </ThemedText>
                <ThemedText type="smallBold">
                  {goalMode === 'manual' || goalFrequency === 'manual'
                    ? 'Aportes manuales'
                    : goalMode === 'percent'
                      ? `Aportarás ${parseAmount(goalPercent) || 0}% ${goalSchedulePreview}`
                      : `Aportarás ${formatCurrency(parseAmount(goalFixedAmount) || 0, goalCurrency)} ${goalSchedulePreview}`}
                </ThemedText>
              </Card>

              <View style={styles.goalFormActions}>
                <Pressable
                  onPress={handleSaveGoal}
                  style={({ pressed }) => [
                    styles.saveButton,
                    { backgroundColor: theme.brand },
                    pressed && styles.buttonPressed,
                  ]}>
                  <ThemedText type="smallBold" style={[styles.saveText, { color: theme.onBrand }]}>
                    {editingGoalId
                      ? goalEditDone
                        ? 'Cambios guardados'
                        : 'Guardar cambios'
                      : goalAddedDone
                        ? 'Meta guardada'
                        : 'Guardar meta'}
                  </ThemedText>
                </Pressable>
                {editingGoalId ? (
                  <Pressable
                    onPress={resetGoalForm}
                    style={({ pressed }) => [
                      styles.outlineButton,
                      { borderColor: theme.border },
                      pressed && styles.buttonPressed,
                    ]}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      Cancelar edición
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </Card>
          </View>
        ) : null}

        {activeTab !== 'Metas' ? (
          <Pressable
            onPress={handleSavePlan}
            style={({ pressed }) => [
              styles.mainSaveButton,
              { backgroundColor: savePlanColor },
              pressed && styles.buttonPressed,
            ]}>
            <ThemedText type="smallBold" style={[styles.saveText, { color: savePlanTextColor }]}>
              {savePlanDone ? 'Plan guardado' : 'Guardar plan'}
            </ThemedText>
          </Pressable>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  tabRow: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  sectionBody: {
    marginTop: Spacing.three,
    gap: Spacing.three,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  goalSummaryViewport: {
    width: '100%',
  },
  goalSummaryContent: {
    alignItems: 'flex-start',
  },
  goalSummaryPage: {
    gap: Spacing.two,
  },
  summaryCurrencyHint: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  summaryDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  innerCard: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  manualAction: {
    gap: Spacing.two,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  inlineAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  inlineInput: {
    flex: 1,
  },
  inlineCurrency: {
    height: 44,
    justifyContent: 'center',
  },
  actionButton: {
    paddingVertical: Spacing.two,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
  },
  outlineButton: {
    paddingVertical: Spacing.two,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  mainSaveButton: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveButton: {
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveText: {
    color: '#ffffff',
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  goalSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  goalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  goalSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  goalSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalsStack: {
    gap: Spacing.three,
  },
  goalCard: {
    gap: Spacing.two,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  goalForm: {
    gap: Spacing.two,
    padding: Spacing.three,
  },
  goalCurrencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  goalAction: {
    gap: Spacing.two,
  },
  goalActionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  goalActionButton: {
    flex: 1,
  },
  goalFormActions: {
    gap: Spacing.two,
  },
  separator: {
    height: 1,
    backgroundColor: '#e6d4c6',
    marginVertical: Spacing.two,
  },
  buttonPressed: {
    opacity: 0.85,
  },
});






