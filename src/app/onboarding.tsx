import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { setHasSeenOnboarding } from '@/constants/launch-state';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function OnboardingScreen() {
  const theme = useTheme();

  const handleContinue = async () => {
    await setHasSeenOnboarding(true);
    router.replace('/');
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <ThemedText type="subtitle">Instant</ThemedText>
        <ThemedText themeColor="textSecondary">
          Tus finanzas claras al instante
        </ThemedText>
      </View>

      <Card variant="soft">
        <ThemedText style={styles.description}>
          Registrá ingresos y gastos en segundos, entendé tu disponible semanal y
          mensual, y compartí gastos con Instant Duo.
        </ThemedText>
      </Card>

      <Card>
        <View style={styles.points}>
          <ThemedText type="smallBold">• Carga rápida de movimientos</ThemedText>
          <ThemedText type="smallBold">• Metas de ahorro claras</ThemedText>
          <ThemedText type="smallBold">• Calendario de vencimientos</ThemedText>
          <ThemedText type="smallBold">• Modo compartido para dos</ThemedText>
        </View>
      </Card>

      <Pressable
        onPress={handleContinue}
        style={[styles.cta, { backgroundColor: theme.brand }]}>
        <ThemedText type="smallBold" style={[styles.ctaText, { color: theme.onBrand }]}>
          Comenzar
        </ThemedText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: Spacing.one,
  },
  description: {
    fontSize: 18,
    lineHeight: 26,
  },
  points: {
    gap: Spacing.two,
  },
  cta: {
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: '#ffffff',
  },
});
