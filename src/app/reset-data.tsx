import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { clearAllData } from '@/lib/storage';

export default function ResetDataScreen() {
  const theme = useTheme();
  const handleReset = () => {
    Alert.alert(
      'Borrar datos',
      'Vas a eliminar tus movimientos, metas y configuraciones locales. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Alert.alert('Datos borrados', 'Se reinició la información local de Instant.');
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Reiniciar datos</ThemedText>
        <ThemedText themeColor="textSecondary">
          Usá esta opción solo si necesitás empezar de cero.
        </ThemedText>
      </View>

      <Card variant="soft">
        <SectionHeader title="Borrar información" />
        <ThemedText type="small" themeColor="textSecondary">
          Esto eliminará movimientos, metas y configuraciones locales guardadas en este dispositivo.
        </ThemedText>
        <Pressable
          onPress={handleReset}
          style={({ pressed }) => [
            styles.dangerButton,
            { backgroundColor: theme.accentSoft },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={[styles.dangerText, { color: theme.accent }]}>
            Borrar datos locales
          </ThemedText>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  dangerButton: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    alignItems: 'center',
  },
  dangerText: {
    color: '#7A3B2A',
  },
  pressed: {
    opacity: 0.85,
  },
});
