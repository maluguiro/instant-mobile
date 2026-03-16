import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';

export default function AccountScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Cuenta</ThemedText>
        <ThemedText themeColor="textSecondary">
          Próximamente vas a poder gestionar tu cuenta desde acá.
        </ThemedText>
      </View>

      <Card variant="soft">
        <SectionHeader title="Estado" />
        <ThemedText type="small" themeColor="textSecondary">
          Esta sección se activará cuando sumemos login y sincronización.
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
