import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ListItem } from '@/components/ui/list-item';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { movementFilters, movementGroups } from '@/constants/mock-data';
import { Spacing } from '@/constants/theme';

export default function MovementsScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Movimientos</ThemedText>
        <ThemedText themeColor="textSecondary">
          Todos tus ingresos y gastos en un solo lugar.
        </ThemedText>
      </View>

      <View style={styles.filters}>
        {movementFilters.map((filter) => (
          <Pill key={filter} label={filter} tone={filter === 'Todo' ? 'accent' : 'default'} />
        ))}
      </View>

      {movementGroups.map((group) => (
        <Card key={group.label}>
          <SectionHeader title={group.label} />
          <ThemedText type="small" themeColor="textSecondary">
            Total {group.total}
          </ThemedText>
          <View style={styles.listGap}>
            {group.items.map((item) => (
              <ListItem
                key={item.id}
                title={item.title}
                subtitle={`${item.category} · ${item.account}`}
                trailing={item.amount}
              />
            ))}
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  listGap: {
    marginTop: Spacing.three,
    gap: Spacing.three,
  },
});
