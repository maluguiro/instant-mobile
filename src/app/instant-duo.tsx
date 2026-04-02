import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, Share, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { DuoToggle } from '@/components/ui/duo-toggle';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useDuo } from '@/hooks/use-duo';
import { useTheme } from '@/hooks/use-theme';
import { createDuo, joinDuo, leaveDuo } from '@/lib/duo';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';

export default function InstantDuoScreen() {
  const theme = useTheme();
  const { state, refresh, setContext } = useDuo();
  const [loading, setLoading] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

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
      refresh().then(async (next) => {
        if (!next.closedAt || !next.duoId) return;
        const key = `${STORAGE_KEYS.duoClosedNotice}:${next.duoId}`;
        const seen = await getItem<string | null>(key, null);
        if (seen !== next.closedAt) {
          const by = next.closedByName ? `${next.closedByName} ` : '';
          Alert.alert(
            'Instant Duo cerrado',
            `${by}disolviÃ³ Instant Duo. Ahora podÃ©s crear o unirte a un nuevo Duo si lo necesitÃ¡s.`
          );
          await setItem(key, next.closedAt);
        }
      });
    }, [refresh])
  );

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      await createDuo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos crear Duo.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    setError('');
    try {
      await joinDuo(code);
      setJoinOpen(false);
      setJoinCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos unirnos a Duo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!state.code) return;
    const Clipboard = getClipboardModule();
    if (Clipboard?.setStringAsync) {
      await Clipboard.setStringAsync(state.code);
      Alert.alert('Código copiado', 'Listo para compartir.');
      return;
    }
    await Share.share({
      message: `Unite a mi Instant Duo con este código: ${state.code}`,
    });
  };

  const handleShare = async () => {
    if (!state.code) return;
    await Share.share({
      message: `Unite a mi Instant Duo con este código: ${state.code}`,
    });
  };

  const handleLeave = () => {
    Alert.alert(
      'Disolver Duo',
      'Esta acciÃ³n cierra el espacio compartido para las dos personas. Ambos volverÃ¡n a modo Solo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Disolver',
          style: 'destructive',
          onPress: async () => {
            await leaveDuo();
          },
        },
      ]
    );
  };

  const isActive = state.activeContext === 'duo';
  const hasDuo = state.status === 'member' && Boolean(state.duoId);
  const isClosed = Boolean(state.closedAt);
  const showStartCard = !hasDuo || isClosed;

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Instant Duo</ThemedText>
        <ThemedText themeColor="textSecondary">
          Duo es un espacio compartido para registrar gastos, metas, ahorro y presupuesto entre dos personas.
        </ThemedText>
      </View>

      <Card style={[styles.banner, { backgroundColor: theme.duoSoft, borderColor: theme.duoAccent }]}>
        <SectionHeader title="Contexto actual" />
        <View style={styles.bannerRow}>
          <View style={styles.bannerInfo}>
            <ThemedText type="small" themeColor="textSecondary">
              {isActive ? 'Duo activo' : 'Cuenta personal'}
            </ThemedText>
            <ThemedText type="smallBold">
              {isActive ? 'Todo lo que hagas aqui es compartido' : 'Tus datos personales siguen separados'}
            </ThemedText>
          </View>
          <DuoToggle />
        </View>
      </Card>

      {showStartCard ? (
        <Card style={[styles.duoCard, { backgroundColor: theme.duoSoft, borderColor: theme.duoAccent }]}>
          <SectionHeader title={isClosed ? 'Duo cerrado' : 'Empezar Duo'} />
          <ThemedText type="small" themeColor="textSecondary">
            {isClosed
              ? 'Tu Duo anterior quedÃ³ cerrado. PodÃ©s crear uno nuevo o unirte a otro cÃ³digo.'
              : 'Crea un Duo para invitar a alguien o unite con un codigo.'}
          </ThemedText>
          {error ? (
            <ThemedText type="smallBold" style={{ color: theme.warning }}>
              {error}
            </ThemedText>
          ) : null}
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleCreate}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.duoAccent },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.onBrand }}>
                Crear Duo
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setJoinOpen(true)}
              style={({ pressed }) => [
                styles.outlineButton,
                { borderColor: theme.duoAccent },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.duoAccent }}>
                Unirme a Duo
              </ThemedText>
            </Pressable>
          </View>
        </Card>
      ) : (
        <Card style={[styles.duoCard, { backgroundColor: theme.duoSoft, borderColor: theme.duoAccent }]}>
          <SectionHeader title="Gestionar Duo" />
          <ThemedText type="small" themeColor="textSecondary">
            Encontr� el c�digo, compartir y disolver en Ajustes > Tu Duo.
          </ThemedText>
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => setContext(isActive ? 'personal' : 'duo')}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.duoAccent },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.onBrand }}>
                {isActive ? 'Volver a personal' : 'Cambiar a Duo'}
              </ThemedText>
            </Pressable>
          </View>
        </Card>
      )}

      <Modal visible={joinOpen} transparent animationType="fade" onRequestClose={() => setJoinOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <ThemedText type="subtitle">Unirse a Duo</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Ingresar codigo compartido.
            </ThemedText>
            {error ? (
              <ThemedText type="smallBold" style={{ color: theme.warning }}>
                {error}
              </ThemedText>
            ) : null}
            <TextInput
              placeholder="Codigo"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setJoinOpen(false)}
                style={({ pressed }) => [
                  styles.outlineButton,
                  { borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Cancelar
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleJoin}
                disabled={loading}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.duoAccent },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.onBrand }}>
                  Unirme
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  banner: {
    borderWidth: 1,
    gap: Spacing.two,
  },
  duoHero: {
    borderWidth: 1,
    gap: Spacing.two,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  bannerInfo: {
    flex: 1,
    gap: Spacing.one,
  },
  actionRow: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  duoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  codeActions: {
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  dissolveButton: {
    marginTop: Spacing.two,
  },
  primaryButton: {
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
  },
  duoCard: {
    borderWidth: 1,
  },
  outlineButton: {
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalCard: {
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalActions: {
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.85,
  },
});
