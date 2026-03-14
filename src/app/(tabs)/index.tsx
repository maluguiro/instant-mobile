import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ListItem } from '@/components/ui/list-item';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { StatRow } from '@/components/ui/stat-row';
import { quickActions } from '@/constants/mock-data';
import {
  calculateAvailable,
  calculateTotals,
  filterByMonth,
  formatCurrency,
  formatShortDate,
  getWeeklyPlanAmount,
} from '@/lib/finance';
import { useTransactions } from '@/hooks/use-transactions';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useFinanceSettings } from '@/hooks/use-finance-settings';
import { getSavingsGoals, SavingsGoal } from '@/lib/goals';

export default function HomeScreen() {
  const theme = useTheme();
  const { transactions, refresh } = useTransactions();
  const { settings, refresh: refreshSettings } = useFinanceSettings();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshSettings();
      getSavingsGoals().then(setGoals);
    }, [refresh, refreshSettings])
  );

  const { monthTotals, monthAvailable } = useMemo(() => {
    const now = new Date();
    const monthTx = filterByMonth(transactions, now);
    const totals = calculateTotals(monthTx);
    const availability = calculateAvailable(totals, settings);

    return {
      monthTotals: totals,
      monthAvailable: availability,
    };
  }, [transactions, settings]);

  const weeklyPlan = useMemo(
    () => getWeeklyPlanAmount(settings, monthAvailable.available),
    [settings, monthAvailable.available]
  );

  const recent = transactions.slice(0, 3);

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Hola, Malena</ThemedText>
        <ThemedText themeColor="textSecondary">
          ¿Cómo estás hoy? Esta es tu foto financiera.
        </ThemedText>
      </View>

      <Card style={[styles.primaryCard, { backgroundColor: theme.cardAlt }]}>
        <View style={styles.primaryHeader}>
          <View>
            <ThemedText type="small" themeColor="textSecondary">
              Disponible mensual
            </ThemedText>
            <ThemedText type="title" style={styles.primaryValue}>
              {formatCurrency(monthAvailable.available)}
            </ThemedText>
          </View>
          <Pill label="Disponible" tone="accent" />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Ingresos menos egresos y ahorro reservado
        </ThemedText>
      </Card>

      <Pressable
        onPress={() => router.push({ pathname: '/budget', params: { tab: 'Semanal' } })}
        style={({ pressed }) => [pressed && styles.cardPressed]}>
        <Card style={styles.secondaryCard}>
          <View style={styles.secondaryHeader}>
            <ThemedText type="small" themeColor="textSecondary">
              Disponible semanal
            </ThemedText>
            <Pill label="Plan semanal" />
          </View>
          <ThemedText type="subtitle" style={styles.secondaryValue}>
            {settings.weeklyMode === 'manual'
              ? weeklyPlan > 0
                ? formatCurrency(weeklyPlan)
                : 'Sin habilitar'
              : formatCurrency(weeklyPlan)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {settings.weeklyMode === 'manual'
              ? 'Habilitás el disponible cuando lo necesitás'
              : 'Monto fijo configurado'}
          </ThemedText>
        </Card>
      </Pressable>

      <Card>
        <SectionHeader title="Resumen del mes" />
        <View style={styles.statsRow}>
          <StatRow
            label="Ingresos"
            value={formatCurrency(monthTotals.income)}
            tone="positive"
            style={styles.statItem}
          />
          <StatRow
            label="Egresos"
            value={formatCurrency(monthTotals.expense)}
            tone="neutral"
            style={styles.statItem}
          />
          <StatRow
            label="Ahorro"
            value={formatCurrency(monthAvailable.savingsTotal)}
            tone="positive"
            style={styles.statItem}
          />
        </View>
      </Card>

      <Card variant="soft">
        <SectionHeader title="Accesos rápidos" />
        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => router.push(action.route)}
              style={({ pressed }) => [
                styles.quickAction,
                { borderColor: theme.border, backgroundColor: theme.card },
                pressed && styles.quickActionPressed,
              ]}>
              <ThemedText type="smallBold">{action.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Tus focos" />
        <View style={styles.focusRow}>
          <Pressable
            onPress={() => router.push('/goals-overview')}
            style={({ pressed }) => [
              styles.focusCard,
              { backgroundColor: theme.brandSoft },
              pressed && styles.quickActionPressed,
            ]}>
            <ThemedText type="smallBold">Metas de ahorro</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {goals.length > 0 ? `${goals.length} metas activas` : 'Creá tu primera meta'}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => router.push('/instant-duo')}
            style={({ pressed }) => [
              styles.focusCard,
              { backgroundColor: theme.accentSoft },
              pressed && styles.quickActionPressed,
            ]}>
            <ThemedText type="smallBold">Instant Duo</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Balance compartido
            </ThemedText>
          </Pressable>
        </View>
      </Card>

      <Card>
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
                trailing={`${movement.type === 'income' ? '+' : '-'}${formatCurrency(movement.amount)}`}
              />
            ))
          )}
        </View>
      </Card>

      <Card variant="soft">
        <SectionHeader title="Próximos vencimientos" />
        <ThemedText type="small" themeColor="textSecondary">
          Todavía no cargaste vencimientos. Próximamente vas a poder agregarlos desde esta sección.
        </ThemedText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  primaryCard: {
    gap: Spacing.two,
  },
  primaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
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
  secondaryValue: {
    fontSize: 26,
    lineHeight: 32,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    flexWrap: 'wrap',
    marginTop: Spacing.three,
  },
  statItem: {
    minWidth: 110,
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
