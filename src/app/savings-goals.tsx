import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { formatCurrency } from '@/lib/finance';
import { getSavingsGoals, SavingsGoal } from '@/lib/goals';

export default function SavingsGoalsScreen() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);

  useFocusEffect(
    useCallback(() => {
      getSavingsGoals().then(setGoals);
    }, [])
  );

  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [goals]
  );

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Metas de ahorro</ThemedText>
        <ThemedText themeColor="textSecondary">
          Seguí tu progreso con datos reales de tus metas.
        </ThemedText>
      </View>

      {sortedGoals.length === 0 ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            Todavía no creaste metas de ahorro.
          </ThemedText>
        </Card>
      ) : (
        sortedGoals.map((goal) => {
          const progress = goal.target > 0 ? Math.min(goal.saved / goal.target, 1) : 0;
          return (
            <Card key={goal.id}>
              <SectionHeader title={goal.title} />
              <ThemedText type="small" themeColor="textSecondary">
                {formatCurrency(goal.saved, goal.currency)} ahorrados de {formatCurrency(goal.target, goal.currency)}
              </ThemedText>
              <View style={styles.goalRow}>
                <ThemedText type="smallBold">{Math.round(progress * 100)}%</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {goal.currency}
                </ThemedText>
              </View>
              <ProgressBar value={progress} />
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  goalRow: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
