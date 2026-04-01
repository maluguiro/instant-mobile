import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ListItem } from '@/components/ui/list-item';
import { Pill } from '@/components/ui/pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { DuoToggle } from '@/components/ui/duo-toggle';
import { StatRow } from '@/components/ui/stat-row';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { quickActions } from '@/constants/mock-data';
import { Spacing } from '@/constants/theme';
import { useAppSettings } from '@/hooks/use-app-settings';
import { useAuth } from '@/hooks/use-auth';
import { useDuo } from '@/hooks/use-duo';
import { useFinanceSettings } from '@/hooks/use-finance-settings';
import { useTheme } from '@/hooks/use-theme';
import { useTransactions } from '@/hooks/use-transactions';
import { DueDate, getDueDates, getInstallments, getRecurringPayments, Installment, RecurringPayment } from '@/lib/calendar';
import {
  calculateAvailable,
  calculateTotals,
  filterByCurrency,
  filterByMonth,
  formatCurrency,
  formatShortDate,
  getTransactionCurrency,
  startOfWeek,
  toISODate,
} from '@/lib/finance';
import { ensureWeeklyRenewal } from '@/lib/weekly-renewal';
import { getSavingsGoals, SavingsGoal } from '@/lib/goals';

export default function HomeScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { state: duoState, setContext } = useDuo();
  const { transactions, refresh } = useTransactions();
  const { settings, refresh: refreshSettings } = useFinanceSettings();
  const { settings: appSettings } = useAppSettings();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [dueDates, setDueDates] = useState<DueDate[]>([]);
  const [recurring, setRecurring] = useState<RecurringPayment[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [currencyIndex, setCurrencyIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [summaryWidth, setSummaryWidth] = useState(0);
  const mainCarouselRef = useRef<ScrollView>(null);
  const summaryCarouselRef = useRef<ScrollView>(null);
  const isDuo = duoState.activeContext === 'duo';
  const headerTitle = isDuo
    ? `${user?.name ?? 'Vos'} + Duo`
    : `Hola, ${user?.name ?? 'bienvenida'}`;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const run = async () => {
        await refresh();
        await refreshSettings();
        await ensureWeeklyRenewal(null, appSettings.currency);
        await refresh();
        const loadedGoals = await getSavingsGoals();
        if (active) setGoals(loadedGoals);
        const [due, rec, inst] = await Promise.all([getDueDates(), getRecurringPayments(), getInstallments()]);
        if (active) {
          setDueDates(due);
          setRecurring(rec);
          setInstallments(inst);
        }
      };
      run();
      return () => {
        active = false;
      };
    }, [refresh, refreshSettings, appSettings.currency, duoState.activeContext, duoState.duoId])
  );

  const monthData = useMemo(() => {
    const now = new Date();
    const monthTx = filterByMonth(transactions, now);
    const currencies = Array.from(
      new Set(monthTx.map((tx) => getTransactionCurrency(tx, appSettings.currency)))
    );

    const normalizedCurrencies =
      currencies.length > 0
        ? currencies.includes(appSettings.currency)
          ? [
              appSettings.currency,
              ...currencies.filter((currency) => currency !== appSettings.currency),
            ]
          : currencies
        : [appSettings.currency];

    return normalizedCurrencies.map((currency) => {
      const currencyTx = filterByCurrency(monthTx, currency);
      const totals = calculateTotals(currencyTx, currency);
        const availability = calculateAvailable(totals, settings, currency, currencyTx, new Date());

      return {
        currency,
        totals,
        availability,
      };
    });
  }, [transactions, settings, appSettings.currency]);

  const primaryMonth = useMemo(() => {
    return (
      monthData.find((entry) => entry.currency === appSettings.currency) ??
      monthData[0] ?? {
        currency: appSettings.currency,
        totals: { income: 0, expense: 0, savingsManual: 0 },
        availability: { savingsReserved: 0, savingsTotal: 0, available: 0 },
      }
    );
  }, [monthData, appSettings.currency]);

  useEffect(() => {
    if (currencyIndex >= monthData.length) {
      setCurrencyIndex(0);
    }
  }, [currencyIndex, monthData.length]);

  const activeMonth = monthData[currencyIndex] ?? primaryMonth;

  useEffect(() => {
    if (carouselWidth > 0) {
      mainCarouselRef.current?.scrollTo({ x: currencyIndex * carouselWidth, animated: true });
    }
    if (summaryWidth > 0) {
      summaryCarouselRef.current?.scrollTo({ x: currencyIndex * summaryWidth, animated: true });
    }
  }, [currencyIndex, carouselWidth, summaryWidth]);

  const currencyTransactions = useMemo(
    () => filterByCurrency(transactions, appSettings.currency),
    [transactions, appSettings.currency]
  );

  const latestWeeklyRenewal = useMemo(() => {
    const candidates = currencyTransactions.filter(
      (tx) =>
        tx.system === 'weekly-renewal' ||
        tx.category === 'Renovación semanal' ||
        tx.category === 'RenovaciÃ³n semanal'
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

  const recent = transactions.slice(0, 3);

  const upcoming = useMemo(() => {
    const activeDue = dueDates.filter((item) => item.status !== 'paid');
    const activeRec = recurring.filter((item) => item.status === 'active');
    const activeInst = installments.filter((item) => item.status !== 'completed');
    const items = [
      ...activeDue.map((item) => ({
        key: `due-${item.id}`,
        name: item.name,
        amount: item.amount,
        currency: item.currency,
        date: item.date,
        type: 'Pago único',
        label: 'Próximo vencimiento',
      })),
      ...activeRec.map((item) => ({
        key: `rec-${item.id}`,
        name: item.name,
        amount: item.amount,
        currency: item.currency,
        date: item.nextDate,
        type: 'Recurrente',
        label: 'Próximo pago',
      })),
      ...activeInst.map((item) => ({
        key: `inst-${item.id}`,
        name: item.name,
        amount: item.amount,
        currency: item.currency,
        date: item.nextDate,
        type: 'Cuota',
        label: 'Próxima cuota',
      })),
    ];
    return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  }, [dueDates, installments, recurring]);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <ThemedText type="subtitle">{headerTitle}</ThemedText>
          <View style={styles.toggleRow}>
            <DuoToggle />
            <ThemeToggle />
          </View>
        </View>
        <ThemedText themeColor="textSecondary">
          ¿Cómo estás hoy? Esta es tu foto financiera.
        </ThemedText>
      </View>

      <Card
        style={[
          styles.primaryCard,
          { backgroundColor: isDuo ? theme.duoSoft : theme.cardAlt },
          isDuo && styles.duoCardBorder(theme),
        ]}>
        <View
          style={styles.carouselViewport}
          onLayout={(event) => {
            setCarouselWidth(event.nativeEvent.layout.width);
          }}>
          <ScrollView
            ref={mainCarouselRef}
            horizontal
            pagingEnabled
            decelerationRate="fast"
            snapToAlignment="start"
            snapToInterval={carouselWidth || 1}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={monthData.length > 1}
            contentContainerStyle={styles.carouselContent}
            onMomentumScrollEnd={(event) => {
              if (!carouselWidth) return;
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / carouselWidth);
              setCurrencyIndex(Math.max(0, Math.min(nextIndex, monthData.length - 1)));
            }}>
            {monthData.map((entry) => (
              <View
                key={entry.currency}
                style={[styles.carouselPage, { width: carouselWidth || '100%' }]}>
                <View style={styles.primaryHeader}>
                  <View>
                    <View style={styles.headerLabelRow}>
                      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.secondaryTitle}>
                      Disponible mensual
                      </ThemedText>
                    </View>
                    <ThemedText type="title" style={styles.primaryValue}>
                      {formatCurrency(entry.availability.available, entry.currency)}
                    </ThemedText>
                  </View>
                  <View style={styles.currencyHint}>
                    <Pill label={entry.currency} tone="accent" />
                    {monthData.length > 1 ? (
                      <View style={styles.dotRow}>
                        {monthData.map((item, index) => (
                          <View
                            key={item.currency}
                            style={[
                              styles.dot,
                              { backgroundColor: index === currencyIndex ? (isDuo ? theme.duoAccent : theme.brand) : theme.border },
                            ]}
                          />
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  Ingresos menos egresos y ahorro reservado
                </ThemedText>
              </View>
            ))}
          </ScrollView>
        </View>
      </Card>

      <Pressable
        onPress={() => router.push({ pathname: '/budget', params: { tab: 'Semanal' } })}
        style={({ pressed }) => [pressed && styles.cardPressed]}>
        <Card
          style={[
            styles.secondaryCard,
            isDuo && styles.duoCardBorder(theme),
            isDuo && { backgroundColor: theme.duoSoft },
          ]}>
          <View style={styles.secondaryHeader}>
            <View style={styles.headerLabelRow}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.secondaryTitle}>
                Disponible semanal
              </ThemedText>
            </View>
            <ThemedText type="subtitle" style={styles.secondaryValue}>
              {formatCurrency(weeklyEnabled)}
            </ThemedText>
          </View>
          <ProgressBar value={weeklyEnabled > 0 ? weeklyUsed / weeklyEnabled : 0} />
          <View style={styles.weeklySummaryRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Usado: {formatCurrency(weeklyUsed)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Restante: {formatCurrency(weeklyRemaining)}
            </ThemedText>
          </View>
        </Card>
      </Pressable>

      <Card style={isDuo ? [styles.duoCardBorder(theme), { backgroundColor: theme.duoSoft }] : undefined}>
        <View
          style={styles.carouselViewport}
          onLayout={(event) => {
            setSummaryWidth(event.nativeEvent.layout.width);
          }}>
          <ScrollView
            ref={summaryCarouselRef}
            horizontal
            pagingEnabled
            decelerationRate="fast"
            snapToAlignment="start"
            snapToInterval={summaryWidth || 1}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={monthData.length > 1}
            contentContainerStyle={styles.carouselContent}
            onMomentumScrollEnd={(event) => {
              if (!summaryWidth) return;
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / summaryWidth);
              setCurrencyIndex(Math.max(0, Math.min(nextIndex, monthData.length - 1)));
            }}>
            {monthData.map((entry) => (
              <View
                key={entry.currency}
                style={[styles.carouselPage, { width: summaryWidth || '100%' }]}>
                <View style={styles.summaryHeaderRow}>
                  <View style={styles.headerLabelRow}>
                    <ThemedText type="smallBold">Resumen del mes</ThemedText>
                  </View>
                  <View style={styles.currencyHint}>
                    <Pill label={entry.currency} tone="accent" />
                    {monthData.length > 1 ? (
                      <View style={styles.dotRow}>
                        {monthData.map((item, index) => (
                          <View
                            key={item.currency}
                            style={[
                              styles.dot,
                              {
                                backgroundColor:
                                  index === currencyIndex
                                    ? isDuo
                                      ? theme.duoAccent
                                      : theme.brand
                                    : theme.border,
                              },
                            ]}
                          />
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={styles.statsRow}>
                  <StatRow
                    label="Ingresos"
                    value={formatCurrency(entry.totals.income, entry.currency)}
                    tone="positive"
                    style={styles.statItem}
                  />
                  <StatRow
                    label="Egresos"
                    value={formatCurrency(entry.totals.expense, entry.currency)}
                    tone="neutral"
                    style={styles.statItem}
                  />
                  <StatRow
                    label="Ahorro"
                    value={formatCurrency(entry.availability.savingsTotal, entry.currency)}
                    tone="positive"
                    style={styles.statItem}
                  />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Card>

      <Card
        variant="soft"
        style={isDuo ? [styles.duoCardBorder(theme), { backgroundColor: theme.duoSoft }] : undefined}>
        <SectionHeader title="Accesos rápidos" />
        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => router.push(action.route)}
              style={({ pressed }) => [
                styles.quickAction,
                { borderColor: isDuo ? theme.duoAccent : theme.border, backgroundColor: isDuo ? theme.duoSoft : theme.card },
                pressed && styles.quickActionPressed,
              ]}>
              <ThemedText type="smallBold">{action.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={isDuo ? [styles.duoCardBorder(theme), { backgroundColor: theme.duoSoft }] : undefined}>
        <SectionHeader title="Tus focos" />
        <View style={styles.focusRow}>
          <Pressable
            onPress={() => router.push('/goals-overview')}
            style={({ pressed }) => [
              styles.focusCard,
              { backgroundColor: isDuo ? theme.duoSoft : theme.brandSoft },
              isDuo && { borderColor: theme.duoAccent, borderWidth: 1 },
              pressed && styles.quickActionPressed,
            ]}>
            <ThemedText type="smallBold">Metas de ahorro</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {goals.length > 0 ? `${goals.length} metas activas` : 'Creá tu primera meta'}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => {
              if (isDuo) {
                setContext('personal');
                return;
              }
              router.push('/instant-duo');
            }}
            style={({ pressed }) => [
              styles.focusCard,
              { backgroundColor: isDuo ? theme.duoSoft : theme.accentSoft },
              isDuo && { borderColor: theme.duoAccent, borderWidth: 1 },
              pressed && styles.quickActionPressed,
            ]}>
            <ThemedText type="smallBold">{isDuo ? 'Instant Solo' : 'Instant Duo'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {isDuo ? 'Volver a tu espacio personal' : 'Balance compartido'}
            </ThemedText>
          </Pressable>
        </View>
      </Card>

      <Card style={isDuo ? [styles.duoCardBorder(theme), { backgroundColor: theme.duoSoft }] : undefined}>
        <SectionHeader
          title="Últimos movimientos"
          actionLabel="Ver todos"
          onPress={() => router.push('/movements')}
        />
        <View style={styles.listGap}>
          {recent.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Registrá tu primer movimiento para verlos acá.
            </ThemedText>
          ) : (
            recent.map((movement) => (
              <ListItem
                key={movement.id}
                title={movement.category}
                subtitle={`${movement.method} · ${formatShortDate(movement.date)}`}
                trailing={`${movement.type === 'income' ? '+' : '-'}${formatCurrency(movement.amount, movement.currency)}`}
                onPress={() => router.push({ pathname: '/movements', params: { edit: movement.id } })}
              />
            ))
          )}
        </View>
      </Card>

      <Card
        variant="soft"
        style={isDuo ? [styles.duoCardBorder(theme), { backgroundColor: theme.duoSoft }] : undefined}>
        <SectionHeader
          title="Próximos vencimientos"
          actionLabel="Ver calendario"
          onPress={() => router.push('/calendar')}
        />
        {upcoming.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Todavía no cargaste pagos. Podés agregarlos desde Calendario.
          </ThemedText>
        ) : (
          <View style={styles.listGap}>
            {upcoming.map((item) => (
              <ListItem
                key={item.key}
                title={item.name}
                subtitle={`${item.label}: ${formatShortDate(item.date)} · ${item.type}`}
                trailing={formatCurrency(item.amount, item.currency)}
                onPress={() => router.push('/calendar')}
              />
            ))}
          </View>
        )}
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  primaryCard: {
    gap: Spacing.two,
  },
  duoCardBorder: (theme: { duoAccent: string; duoBorder?: string }) => ({
    borderWidth: 1,
    borderColor: theme.duoBorder ?? theme.duoAccent,
  }),
  carouselViewport: {
    width: '100%',
  },
  carouselContent: {
    alignItems: 'flex-start',
  },
  carouselPage: {
    gap: Spacing.two,
  },
  primaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  primaryValue: {
    fontSize: 36,
    lineHeight: 40,
  },
  secondaryCard: {
    gap: Spacing.one,
  },
  secondaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardPressed: {
    opacity: 0.92,
  },
  currencyHint: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  secondaryValue: {
    fontSize: 18,
    lineHeight: 24,
  },
  secondaryTitle: {
    fontSize: 17,
    lineHeight: 22,
    marginTop: -2,
  },
  weeklySummaryRow: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  statsRow: {
    flexDirection: 'column',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  statItem: {
    minWidth: 0,
  },
  quickActions: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  quickAction: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickActionPressed: {
    opacity: 0.85,
  },
  focusRow: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  focusCard: {
    flex: 1,
    minWidth: 160,
    padding: Spacing.three,
    borderRadius: 18,
    gap: Spacing.one,
  },
  listGap: {
    marginTop: Spacing.three,
    gap: Spacing.three,
  },
});





