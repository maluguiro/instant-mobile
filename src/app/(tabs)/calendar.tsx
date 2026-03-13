import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ListItem } from '@/components/ui/list-item';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { calendarItems, upcomingBills } from '@/constants/mock-data';
import { Spacing } from '@/constants/theme';

export default function CalendarScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Calendario</ThemedText>
        <ThemedText themeColor="textSecondary">
          Tu agenda financiera de la semana.
        </ThemedText>
      </View>

      <Card>
        <SectionHeader title="Próximos vencimientos" />
        <View style={styles.listGap}>
          {upcomingBills.map((bill) => (
            <ListItem
              key={bill.id}
              title={bill.title}
              subtitle={`Vence ${bill.due}`}
              trailing={bill.amount}
            />
          ))}
        </View>
      </Card>

      <Card variant="soft">
        <SectionHeader title="Cuotas y pagos recurrentes" />
        <View style={styles.listGap}>
          {calendarItems.map((item) => (
            <ListItem
              key={item.id}
              title={item.title}
              subtitle={`${item.date} · ${item.type}`}
              trailing={item.amount}
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
  listGap: {
    marginTop: Spacing.three,
    gap: Spacing.three,
  },
});
