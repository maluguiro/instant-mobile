import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ListItem } from '@/components/ui/list-item';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { duoMovements, duoSummary } from '@/constants/mock-data';
import { Spacing } from '@/constants/theme';

export default function InstantDuoScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Instant Duo</ThemedText>
        <ThemedText themeColor="textSecondary">
          Gastos compartidos claros para dos.
        </ThemedText>
      </View>

      <Card>
        <SectionHeader title="Resumen compartido" />
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <ThemedText type="small" themeColor="textSecondary">
              Total mes
            </ThemedText>
            <ThemedText style={styles.summaryValue}>{duoSummary.monthTotal}</ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText type="small" themeColor="textSecondary">
              Vos
            </ThemedText>
            <ThemedText style={styles.summaryValue}>{duoSummary.youPaid}</ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText type="small" themeColor="textSecondary">
              Sofi
            </ThemedText>
            <ThemedText style={styles.summaryValue}>{duoSummary.partnerPaid}</ThemedText>
          </View>
        </View>
        <ThemedText type="smallBold" style={styles.balance}>
          {duoSummary.balance}
        </ThemedText>
      </Card>

      <Card variant="soft">
        <SectionHeader title="Quién pagó qué" />
        <View style={styles.listGap}>
          {duoMovements.map((movement) => (
            <ListItem
              key={movement.id}
              title={movement.title}
              subtitle={`Pagó ${movement.paidBy}`}
              trailing={movement.amount}
            />
          ))}
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
    minWidth: 100,
    gap: Spacing.one,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 700,
  },
  balance: {
    marginTop: Spacing.three,
  },
  listGap: {
    marginTop: Spacing.three,
    gap: Spacing.three,
  },
});
