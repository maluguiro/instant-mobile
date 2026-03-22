import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { clearUserData } from '@/lib/storage';

export default function ResetDataScreen() {
  const theme = useTheme();
  const [confirmStep, setConfirmStep] = useState<0 | 1 | 2>(0);
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    await clearUserData();
    setIsResetting(false);
    setConfirmStep(0);
    setConfirmText('');
    Alert.alert('Datos reiniciados', 'Se reinició la información local de Instant.');
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
        <SectionHeader title="Borrar información local" />
        <ThemedText type="small" themeColor="textSecondary">
          Esto eliminará movimientos, metas, calendario y configuraciones guardadas en este dispositivo.
        </ThemedText>
        <Pressable
          onPress={() => setConfirmStep(1)}
          style={({ pressed }) => [
            styles.dangerButton,
            { backgroundColor: theme.accentSoft },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={[styles.dangerText, { color: theme.accent }]}>
            Reiniciar datos
          </ThemedText>
        </Pressable>
      </Card>

      <Modal
        visible={confirmStep > 0}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setConfirmStep(0);
          setConfirmText('');
        }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            {confirmStep === 1 ? (
              <>
                <SectionHeader title="¿Querés reiniciar tus datos?" />
                <ThemedText type="small" themeColor="textSecondary">
                  Se borrarán tus movimientos, metas, calendario y configuraciones locales.
                </ThemedText>
                <View style={styles.modalActionsRow}>
                  <Pressable
                    onPress={() => setConfirmStep(0)}
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
                    onPress={() => setConfirmStep(2)}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      { backgroundColor: theme.brand },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="smallBold" style={{ color: theme.onBrand }}>
                      Sí, continuar
                    </ThemedText>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <SectionHeader title="Confirmación final" />
                <ThemedText type="small" themeColor="textSecondary">
                  Esta acción no se puede deshacer. Escribí “SI” para confirmar.
                </ThemedText>
                <TextInput
                  placeholder="Escribí SI"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.input,
                    { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
                  ]}
                  value={confirmText}
                  onChangeText={setConfirmText}
                  autoCapitalize="characters"
                />
                <View style={styles.modalActionsRow}>
                  <Pressable
                    onPress={() => {
                      setConfirmStep(0);
                      setConfirmText('');
                    }}
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
                    onPress={handleReset}
                    disabled={confirmText.trim().toUpperCase() !== 'SI' || isResetting}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      { backgroundColor: theme.accent, opacity: confirmText.trim().toUpperCase() === 'SI' ? 1 : 0.5 },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="smallBold" style={{ color: theme.onBrand }}>
                      Reiniciar todo
                    </ThemedText>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  modalCard: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dangerButton: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    alignItems: 'center',
  },
  outlineButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: Spacing.one + 1,
    paddingHorizontal: Spacing.two,
    fontSize: 14,
    fontWeight: '600',
  },
  dangerText: {
    color: '#7A3B2A',
  },
  pressed: {
    opacity: 0.85,
  },
});
