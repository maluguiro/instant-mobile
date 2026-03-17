import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useAppSettings } from '@/hooks/use-app-settings';
import { useTheme } from '@/hooks/use-theme';

export default function NotificationsScreen() {
  const theme = useTheme();
  const { settings, update } = useAppSettings();

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Notificaciones</ThemedText>
        <ThemedText themeColor="textSecondary">
          Activá recordatorios útiles para tu día a día.
        </ThemedText>
      </View>

      <Card variant="soft">
        <SectionHeader title="Recordatorios" />

        <View style={styles.row}>
          <View style={styles.texts}>
            <ThemedText>Vencimientos</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Avisos cuando se acerquen pagos importantes.
            </ThemedText>
          </View>
          <Switch
            value={settings.notifications.dueDates}
            onValueChange={(value) => update({ notifications: { dueDates: value } })}
            trackColor={{ false: theme.border, true: theme.brandSoft }}
            thumbColor={settings.notifications.dueDates ? theme.brand : theme.onBrand}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.texts}>
            <ThemedText>Resumen semanal</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Un recordatorio para revisar tu semana.
            </ThemedText>
          </View>
          <Switch
            value={settings.notifications.weekly}
            onValueChange={(value) => update({ notifications: { weekly: value } })}
            trackColor={{ false: theme.border, true: theme.brandSoft }}
            thumbColor={settings.notifications.weekly ? theme.brand : theme.onBrand}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.texts}>
            <ThemedText>Ahorro programado</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Avisos cuando toque reservar ahorro.
            </ThemedText>
          </View>
          <Switch
            value={settings.notifications.savings}
            onValueChange={(value) => update({ notifications: { savings: value } })}
            trackColor={{ false: theme.border, true: theme.brandSoft }}
            thumbColor={settings.notifications.savings ? theme.brand : theme.onBrand}
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  row: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
});
