import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import {
  calculateTotals,
  filterByMonth,
  filterByWeek,
  formatCurrency,
  summarizeByCategory,
} from '@/lib/finance';
import { useTransactions } from '@/hooks/use-transactions';
import { Spacing } from '@/constants/theme';

const CATEGORY_LIMITS: Record<string, number> = {
  Hogar: 120000,
  Comida: 80000,
  Transporte: 50000,
  Movilidad: 50000,
  Ocio: 30000,
  Servicios: 35000,
  Salud: 30000,
};

export default function BudgetScreen() {
  const { transactions, refresh } = useTransactions();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const { monthTotals, weekTotals, categories } = useMemo(() => {
    const now = new Date();
    const monthTx = filterByMonth(transactions, now);
    const weekTx = filterByWeek(transactions, now);
    const monthTotals = calculateTotals(monthTx);
    const weekTotals = calculateTotals(weekTx);
    const categories = summarizeByCategory(monthTx)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    return { monthTotals, weekTotals, categories };
  }, [transactions]);

  const progress = monthTotals.income
    ? Math.min(monthTotals.expense / monthTotals.income, 1)
    : 0;

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Presupuesto</ThemedText>
        <ThemedText themeColor="textSecondary">
          Mirá cómo se distribuye tu mes y cuánto queda disponible.
        </ThemedText>
      </View>

      <Card>
        <SectionHeader title="Panorama mensual" />
        <View style={styles.overviewGrid}>
          <View style={styles.overviewItem}>
            <ThemedText type="small" themeColor="textSecondary">
              Ingresos del mes
            </ThemedText>
            <ThemedText type="smallBold" style={styles.overviewValue}>
              {formatCurrency(monthTotals.income)}
            </ThemedText>
          </View>
          <View style={styles.overviewItem}>
            <ThemedText type="small" themeColor="textSecondary">
              Egresos del mes
            </ThemedText>
            <ThemedText type="smallBold" style={styles.overviewValue}>
              {formatCurrency(monthTotals.expense)}
            </ThemedText>
          </View>
          <View style={styles.overviewItem}>
            <ThemedText type="small" themeColor="textSecondary">
              Ahorro
            </ThemedText>
            <ThemedText type="smallBold" style={styles.overviewValue}>
              {formatCurrency(monthTotals.savings)}
            </ThemedText>
          </View>
          <View style={styles.overviewItem}>
            <ThemedText type="small" themeColor="textSecondary">
              Disponible mensual
            </ThemedText>
            <ThemedText type="smallBold" style={styles.overviewValue}>
              {formatCurrency(monthTotals.available)}
            </ThemedText>
          </View>
        </View>
        <View style={styles.progressRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Progreso del mes
          </ThemedText>
          <ThemedText type="smallBold">
            {Math.round(progress * 100)}%
          </ThemedText>
        </View>
        <ProgressBar value={progress} />
      </Card>

      <Card variant="soft">
        <SectionHeader title="Disponible semanal" />
        <ThemedText type="subtitle" style={styles.weekValue}>
          {formatCurrency(weekTotals.available)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Semana actual · Ajustable según tus movimientos
        </ThemedText>
      </Card>

      <Card>
        <SectionHeader title="Categorías" />
        {categories.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Todavía no hay gastos categorizados este mes.
          </ThemedText>
        ) : (
          <View style={styles.categories}>
            {categories.map((category) => {
              const limit = CATEGORY_LIMITS[category.category] ?? 50000;
              const progressValue = Math.min(category.amount / limit, 1);
              return (
                <View key={category.category} style={styles.categoryRow}>
                  <View style={styles.categoryHeader}>
                    <ThemedText>{category.category}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatCurrency(category.amount)} / {formatCurrency(limit)}
                    </ThemedText>
                  </View>
                  <ProgressBar value={progressValue} />
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  overviewGrid: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  overviewItem: {
    minWidth: 140,
    gap: Spacing.one,
  },
  overviewValue: {
    fontSize: 18,
  },
  progressRow: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekValue: {
    fontSize: 26,
    lineHeight: 32,
  },
  categories: {
    marginTop: Spacing.three,
    gap: Spacing.three,
  },
  categoryRow: {
    gap: Spacing.two,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
