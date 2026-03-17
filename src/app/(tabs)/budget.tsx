
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, LayoutAnimation, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { CurrencySelect } from '@/components/ui/currency-select';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SelectableOption } from '@/components/ui/selectable-option';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Spacing } from '@/constants/theme';
import { useFinanceSettings } from '@/hooks/use-finance-settings';
import { useTheme } from '@/hooks/use-theme';
import { useAppSettings } from '@/hooks/use-app-settings';
import { useTransactions } from '@/hooks/use-transactions';
import {
  calculateAvailable,
  calculateSavingsReserved,
  calculateTotals,
  filterByCurrency,
  filterByMonth,
  filterByWeek,
  formatCurrency,
  hasOtherCurrencies,
  getWeeklyPlanAmount,
  isSavingsCategory,
  toISODate,
} from '@/lib/finance';
import { defaultFinanceSettings, SavingsFrequency, WeeklyRenewalMode } from '@/lib/finance-settings';
import {
  addSavingsGoal,
  contributeToGoal,
  GoalContributionMode,
  GoalFrequency,
  getSavingsGoals,
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

  const [savePlanDone, setSavePlanDone] = useState(false);
  const [goalAddedDone, setGoalAddedDone] = useState(false);
  const [manualSavingsDone, setManualSavingsDone] = useState(false);
  const [weeklyManualDone, setWeeklyManualDone] = useState(false);
  const [goalContributionDone, setGoalContributionDone] = useState<Record<string, boolean>>({});

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshTransactions();
      getSavingsGoals().then(setGoals);
    }, [refresh, refreshTransactions])
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

  const appCurrency = appSettings.currency;
  const monthTransactions = useMemo(
    () => filterByMonth(transactions, new Date()),
    [transactions]
  );
  const monthCurrencyTransactions = useMemo(
    () => filterByCurrency(monthTransactions, appCurrency),
    [monthTransactions, appCurrency]
  );
  const weekTransactions = useMemo(
    () => filterByWeek(transactions, new Date()),
    [transactions]
  );
  const weekCurrencyTransactions = useMemo(
    () => filterByCurrency(weekTransactions, appCurrency),
    [weekTransactions, appCurrency]
  );
  const hasOtherCurrencyTransactions = useMemo(
    () => hasOtherCurrencies(monthTransactions, appCurrency),
    [monthTransactions, appCurrency]
  );

  const totals = useMemo(
    () => calculateTotals(monthCurrencyTransactions, appCurrency),
    [monthCurrencyTransactions, appCurrency]
  );
  const monthAvailable = useMemo(
    () => calculateAvailable(totals, settings, appCurrency),
    [totals, settings, appCurrency]
  );

  const weeklyEnabled = useMemo(() => {
    if (settings.weeklyMode === 'manual') {
      return Math.max(settings.weeklyManualEnabledAmount, 0);
    }
    return getWeeklyPlanAmount(settings, monthAvailable.available);
  }, [settings, monthAvailable.available]);

  const weeklyUsed = useMemo(
    () =>
      weekCurrencyTransactions.reduce((acc, tx) => {
        if (tx.type !== 'expense' || isSavingsCategory(tx.category)) return acc;
        return acc + tx.amount;
      }, 0),
    [weekCurrencyTransactions]
  );

  const weeklyRemaining = Math.max(weeklyEnabled - weeklyUsed, 0);

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

  const goalSummary = useMemo(() => {
    const sameCurrency = goals.filter((goal) => goal.currency === appCurrency);
    const totalTarget = sameCurrency.reduce((acc, goal) => acc + goal.target, 0);
    const totalSaved = sameCurrency.reduce((acc, goal) => acc + goal.saved, 0);
    const hasOtherCurrencies = goals.some((goal) => goal.currency !== appCurrency);
    return { totalTarget, totalSaved, hasOtherCurrencies };
  }, [goals, appCurrency]);

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

    await update({
      ...settings,
      savingsMode,
      savingsFixed: fixed,
      savingsPercent: percent,
      savingsFrequency,
      savingsEveryDays: everyDays,
      savingsMonthDay: Math.max(parseAmount(savingsMonthDay), 1),
      savingsWeekday,
      savingsCurrency,
      weeklyMode,
      weeklyAmount: weekly,
      weeklyRenewal,
      weeklyCustomDay,
      weeklyEveryDays: weeklyEvery,
    });

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

  const handleAddGoal = async () => {
    const title = goalTitle.trim();
    const target = Math.max(parseAmount(goalTarget), 0);
    const saved = Math.max(parseAmount(goalSaved), 0);
    if (!title || !target) {
      Alert.alert('Completá la meta', 'Agregá un nombre y un monto objetivo válido.');
      return;
    }

    const goal: SavingsGoal = {
      id: String(Date.now()),
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
      createdAt: new Date().toISOString(),
    };

    const next = await addSavingsGoal(goal);
    setGoals(next);
    setGoalTitle('');
    setGoalTarget('');
    setGoalSaved('');
    setGoalFixedAmount('');
    setGoalPercent('');
    setGoalEveryDays('30');
    setGoalMonthDay('1');
    setGoalWeekday(1);
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
          await update({
            ...settings,
            weeklyMode: defaultFinanceSettings.weeklyMode,
            weeklyAmount: defaultFinanceSettings.weeklyAmount,
            weeklyRenewal: defaultFinanceSettings.weeklyRenewal,
            weeklyCustomDay: defaultFinanceSettings.weeklyCustomDay,
            weeklyEveryDays: defaultFinanceSettings.weeklyEveryDays,
            weeklyManualEnabledAmount: defaultFinanceSettings.weeklyManualEnabledAmount,
            weeklyManualEnabledAt: defaultFinanceSettings.weeklyManualEnabledAt,
          });
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
              <View style={styles.goalSummaryRow}>
                <View>
                  <ThemedText type="small" themeColor="textSecondary">
                    Metas activas
                  </ThemedText>
                  <ThemedText type="smallBold">{goals.length}</ThemedText>
                </View>
                <View>
                  <ThemedText type="small" themeColor="textSecondary">
                    Total asignado
                  </ThemedText>
                  <ThemedText type="smallBold">
                    {formatCurrency(goalSummary.totalTarget, appCurrency)}
                  </ThemedText>
                </View>
                <View>
                  <ThemedText type="small" themeColor="textSecondary">
                    Ahorrado
                  </ThemedText>
                  <ThemedText type="smallBold">
                    {formatCurrency(goalSummary.totalSaved, appCurrency)}
                  </ThemedText>
                </View>
              </View>
              {goalSummary.hasOtherCurrencies ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Hay metas en otras monedas. El resumen se muestra en {appCurrency}.
                </ThemedText>
              ) : null}
            </Card>

            <View style={styles.goalsStack}>
              {goals.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Todavía no creaste metas de ahorro.
                </ThemedText>
              ) : (
                goals.map((goal) => (
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
                    <Pressable
                      onPress={() => handleRemoveGoal(goal.id)}
                      style={({ pressed }) => [
                        styles.outlineButton,
                        { borderColor: theme.border },
                        pressed && styles.buttonPressed,
                      ]}>
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        Eliminar meta
                      </ThemedText>
                    </Pressable>
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

              <Pressable
                onPress={handleAddGoal}
                style={({ pressed }) => [
                  styles.saveButton,
                  { backgroundColor: theme.brand },
                  pressed && styles.buttonPressed,
                ]}>
                <ThemedText type="smallBold" style={[styles.saveText, { color: theme.onBrand }]}>
                  {goalAddedDone ? 'Meta guardada' : 'Guardar meta'}
                </ThemedText>
              </Pressable>
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
  separator: {
    height: 1,
    backgroundColor: '#e6d4c6',
    marginVertical: Spacing.two,
  },
  buttonPressed: {
    opacity: 0.85,
  },
});
