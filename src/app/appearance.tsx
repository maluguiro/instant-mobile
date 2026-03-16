import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';

export default function AppearanceScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Apariencia</ThemedText>
        <ThemedText themeColor="textSecondary">
          Ajustes visuales de la app.
        </ThemedText>
      </View>

      <Card variant="soft">
        <SectionHeader title="Modo visual" />
        <ThemedText type="small" themeColor="textSecondary">
          Próximamente vas a poder elegir modo claro u oscuro.
        </ThemedText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
});
