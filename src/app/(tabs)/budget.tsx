import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { budgetCategories, budgetSummary } from '@/constants/mock-data';
import { Spacing } from '@/constants/theme';

export default function BudgetScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Presupuesto</ThemedText>
        <ThemedText themeColor="textSecondary">
          Controlá tu mes con claridad y sin fricción.
        </ThemedText>
      </View>

      <Card>
        <SectionHeader title="Resumen mensual" />
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <ThemedText type="small" themeColor="textSecondary">
              Presupuesto
            </ThemedText>
            <ThemedText style={styles.summaryValue}>{budgetSummary.monthBudget}</ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText type="small" themeColor="textSecondary">
              Gastado
            </ThemedText>
            <ThemedText style={styles.summaryValue}>{budgetSummary.spent}</ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText type="small" themeColor="textSecondary">
              Disponible
            </ThemedText>
            <ThemedText style={styles.summaryValue}>{budgetSummary.remaining}</ThemedText>
          </View>
        </View>
      </Card>

      <Card variant="soft">
        <SectionHeader title="Presupuesto semanal" />
        <ThemedText style={styles.weekValue}>{budgetSummary.weekBudget}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Semana actual · Ajustá sobre la marcha
        </ThemedText>
      </Card>

      <Card>
        <SectionHeader title="Categorías" />
        <View style={styles.categories}>
          {budgetCategories.map((category) => {
            const progress = category.spent / category.limit;
            return (
              <View key={category.id} style={styles.categoryRow}>
                <View style={styles.categoryHeader}>
                  <ThemedText>{category.label}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    ${category.spent.toLocaleString('es-AR')} / ${category.limit.toLocaleString('es-AR')}
                  </ThemedText>
                </View>
                <ProgressBar value={progress} />
              </View>
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  summaryItem: {
    minWidth: 110,
    gap: Spacing.one,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 700,
  },
  weekValue: {
    fontSize: 24,
    fontWeight: 700,
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
