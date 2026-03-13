import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { savingsGoals } from '@/constants/mock-data';
import { Spacing } from '@/constants/theme';

export default function SavingsGoalsScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Metas de ahorro</ThemedText>
        <ThemedText themeColor="textSecondary">
          Seguí tu progreso con metas simples y visibles.
        </ThemedText>
      </View>

      {savingsGoals.map((goal) => (
        <Card key={goal.id}>
          <SectionHeader title={goal.title} />
          <ThemedText type="small" themeColor="textSecondary">
            Meta {goal.target} · Fecha {goal.due}
          </ThemedText>
          <View style={styles.goalRow}>
            <ThemedText type="smallBold">{goal.saved}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {Math.round(goal.progress * 100)}%
            </ThemedText>
          </View>
          <ProgressBar value={goal.progress} />
        </Card>
      ))}
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
