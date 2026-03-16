import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ListItem } from '@/components/ui/list-item';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
type SettingsEntry = {
  label: string;
  route: string;
};

const settingsMenu: SettingsEntry[] = [
  { label: 'Cuenta', route: '/account' },
  { label: 'Cómo usar Instant', route: '/help' },
  { label: 'Categorías', route: '/categories' },
  { label: 'Métodos de pago', route: '/payment-methods' },
  { label: 'Moneda', route: '/currency' },
  { label: 'Notificaciones', route: '/notifications' },
  { label: 'Exportar datos', route: '/export-data' },
  { label: 'Apariencia', route: '/appearance' },
  { label: 'Reiniciar datos', route: '/reset-data' },
];

export default function SettingsScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Ajustes</ThemedText>
        <ThemedText themeColor="textSecondary">
          Personalizá Instant a tu forma de organizarte.
        </ThemedText>
      </View>

      <Card variant="soft">
        <SectionHeader title="Secciones" />
        <View style={styles.listGap}>
          {settingsMenu.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.route)}
              style={({ pressed }) => pressed && styles.pressed}>
              <ListItem title={item.label} trailing="›" />
            </Pressable>
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
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.85,
  },
});
