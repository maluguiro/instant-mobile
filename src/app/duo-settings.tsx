import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useDuo } from '@/hooks/use-duo';
import { useTheme } from '@/hooks/use-theme';
import { leaveDuo } from '@/lib/duo';

export default function DuoSettingsScreen() {
  const theme = useTheme();
  const { state, refresh } = useDuo();
  const [loading, setLoading] = useState(false);

  const getClipboardModule = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('expo-clipboard') as { setStringAsync?: (value: string) => Promise<void> };
    } catch {
      return null;
    }
  };

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleCopy = async () => {
    if (!state.code) return;
    const Clipboard = getClipboardModule();
    if (Clipboard?.setStringAsync) {
      await Clipboard.setStringAsync(state.code);
      Alert.alert('Codigo copiado', 'Listo para compartir.');
      return;
    }
    await Share.share({
      message: `Unite a mi Instant Duo con este codigo: ${state.code}`,
    });
  };

  const handleShare = async () => {
    if (!state.code) return;
    await Share.share({
      message: `Unite a mi Instant Duo con este codigo: ${state.code}`,
    });
  };

  const handleLeave = () => {
    Alert.alert(
      'Disolver Duo',
      'Esta accion cierra el espacio compartido para las dos personas. Ambos volveran a modo Solo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Disolver',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await leaveDuo();
              await refresh();
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const hasDuo = state.status === 'member' && Boolean(state.duoId) && !state.closedAt;

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Tu Duo</ThemedText>
        <ThemedText themeColor="textSecondary">
          Gestiona tu codigo y el estado del espacio compartido.
        </ThemedText>
      </View>

      {hasDuo ? (
        <Card style={[styles.card, { backgroundColor: theme.duoSoft, borderColor: theme.duoAccent }]}>
          <SectionHeader title="Codigo Duo" />
          <ThemedText type="small" themeColor="textSecondary">
            Compartilo para invitar a la otra persona cuando quieras.
          </ThemedText>
          <View style={styles.rowBetween}>
            <View>
              <ThemedText type="small" themeColor="textSecondary">
                Codigo
              </ThemedText>
              <ThemedText type="title">{state.code ?? '---'}</ThemedText>
            </View>
            <View>
              <ThemedText type="small" themeColor="textSecondary">
                Miembros
              </ThemedText>
              <ThemedText type="subtitle">{state.memberCount ?? 1} / 2</ThemedText>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable
              onPress={handleCopy}
              style={({ pressed }) => [
                styles.outlineButton,
                { borderColor: theme.duoAccent },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.duoAccent }}>
                Copiar
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.duoAccent },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.onBrand }}>
                Compartir
              </ThemedText>
            </Pressable>
          </View>
          <Pressable
            disabled={loading}
            onPress={handleLeave}
            style={({ pressed }) => [
              styles.outlineButton,
              { borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Disolver Duo
            </ThemedText>
          </Pressable>
        </Card>
      ) : (
        <Card style={[styles.card, { backgroundColor: theme.duoSoft, borderColor: theme.duoAccent }]}>
          <SectionHeader title="Duo no activo" />
          <ThemedText type="small" themeColor="textSecondary">
            Para crear o unirte a un Duo, abrÃ­ Instant Duo.
          </ThemedText>
          <View style={styles.actions}>
            <Pressable
              onPress={() => router.push('/instant-duo')}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.duoAccent },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.onBrand }}>
                Ir a Instant Duo
              </ThemedText>
            </Pressable>
          </View>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  card: {
    borderWidth: 1,
    gap: Spacing.two,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  actions: {
    marginTop: Spacing.two,
    gap: Spacing.two,
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
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.85,
  },
});
