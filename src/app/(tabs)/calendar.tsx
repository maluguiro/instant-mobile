import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { calendarInstallments } from '@/constants/mock-data';
import { Spacing } from '@/constants/theme';

export default function CalendarScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Calendario</ThemedText>
        <ThemedText themeColor="textSecondary">
          Anticipate a pagos y cuotas con claridad.
        </ThemedText>
      </View>

      <Card>
        <SectionHeader title="Próximos vencimientos" />
        <ThemedText type="small" themeColor="textSecondary">
          Todavía no hay vencimientos cargados. Pronto vas a poder agregarlos desde acá.
        </ThemedText>
      </Card>

      <Card variant="soft">
        <SectionHeader title="Gastos recurrentes" />
        <ThemedText type="small" themeColor="textSecondary">
          Aún no hay recurrencias registradas. Cuando las cargues aparecerán aquí.
        </ThemedText>
      </Card>

      <Card>
        <SectionHeader title="Cuotas activas" />
        {calendarInstallments.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No hay cuotas activas en este momento.
          </ThemedText>
        ) : (
          <View style={styles.listGap}>
            {calendarInstallments.map((item) => (
              <View key={item.id} style={styles.rowBetween}>
                <View style={styles.itemInfo}>
                  <ThemedText type="smallBold">{item.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Próximo pago: {item.date}
                  </ThemedText>
                </View>
                <View style={styles.itemRight}>
                  <Pill label={item.remaining} />
                  <ThemedText type="smallBold">{item.amount}</ThemedText>
                </View>
              </View>
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
  },
  listGap: {
    marginTop: Spacing.three,
    gap: Spacing.three,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
});
