import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AuthWelcomeScreen() {
  const theme = useTheme();

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Tu cuenta en Instant</ThemedText>
        <ThemedText themeColor="textSecondary">
          Guardá tu información y seguí tus finanzas desde cualquier dispositivo.
        </ThemedText>
      </View>

      <Card variant="soft" style={styles.card}>
        <SectionHeader title="Tu cuenta te permite" />
        <View style={styles.benefitsList}>
          <View style={styles.benefitItem}>
            <View style={[styles.dot, { backgroundColor: theme.accent }]} />
            <ThemedText type="small">Acceder a tus registros desde cualquier dispositivo</ThemedText>
          </View>
          <View style={styles.benefitItem}>
            <View style={[styles.dot, { backgroundColor: theme.warning }]} />
            <ThemedText type="small">Recuperar tus datos cuando los necesites</ThemedText>
          </View>
          <View style={styles.benefitItem}>
            <View style={[styles.dot, { backgroundColor: theme.brand }]} />
            <ThemedText type="small">Acceder a nuevas funciones más adelante</ThemedText>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push('/login')}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.brand },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={[styles.primaryText, { color: theme.onBrand }]}
            >
              Iniciar sesión
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => router.push('/signup')}
            style={({ pressed }) => [
              styles.outlineButton,
              { borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Crear cuenta
            </ThemedText>
          </Pressable>
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
  card: {
    gap: Spacing.three,
  },
  actions: {
    gap: Spacing.two,
  },
  benefitsList: {
    gap: Spacing.one,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  primaryButton: {
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
  },
  outlineButton: {
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  primaryText: {
    fontSize: 15,
  },
  pressed: {
    opacity: 0.85,
  },
});
