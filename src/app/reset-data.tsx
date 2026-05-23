import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { clearUserData } from '@/lib/reset-data';

export default function ResetDataScreen() {
  const theme = useTheme();
  const [confirmStep, setConfirmStep] = useState<0 | 1 | 2>(0);
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const result = await clearUserData();
      if (result.status === 'success') {
        Alert.alert(
          'Datos eliminados',
          'Tu cuenta sigue existiendo. Se borraron todos los datos del servidor y del dispositivo.'
        );
      } else {
        Alert.alert(
          'Limpieza parcial',
          'Se borraron todos los datos del dispositivo, pero quedó pendiente parte de la limpieza remota. Tu cuenta y sesión siguen activas.'
        );
      }
    } catch {
      Alert.alert('Error', 'No se pudieron eliminar los datos del dispositivo. Probá de nuevo.');
    } finally {
      setIsResetting(false);
      setConfirmStep(0);
      setConfirmText('');
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Reiniciar datos</ThemedText>
        <ThemedText themeColor="textSecondary">
          Eliminá todo y empezá de cero. Tu cuenta queda intacta.
        </ThemedText>
      </View>

      <Card variant="soft">
        <SectionHeader title="Qué se elimina" />
        <View style={styles.list}>
          {[
            ['Movimientos', 'Del dispositivo y del servidor'],
            ['Categorías personalizadas', 'Del dispositivo y del servidor'],
            ['Métodos de pago', 'Del dispositivo y del servidor'],
            ['Presupuesto semanal y mensual', 'Del dispositivo'],
            ['Ahorro configurado', 'Del dispositivo'],
            ['Metas de ahorro', 'Del dispositivo'],
            ['Vencimientos, cuotas y pagos recurrentes', 'Del dispositivo y del servidor si existe soporte remoto'],
            ['Datos funcionales de Duo', 'Del dispositivo y del servidor'],
          ].map(([label, note], i) => (
            <View key={i} style={styles.listItem}>
              <ThemedText type="small" themeColor="textSecondary">
                •
              </ThemedText>
              <View style={styles.listContent}>
                <ThemedText type="small">{label}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {note}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      </Card>

      <Card variant="soft">
        <SectionHeader title="Qué se conserva" />
        <View style={styles.list}>
          {['Tu cuenta de usuario', 'Login y sesión activa', 'Biometría activada', 'Tu nombre'].map((item, i) => (
            <View key={i} style={styles.listItem}>
              <ThemedText type="small" style={{ color: theme.success }}>
                •
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.success }}>
                {item}
              </ThemedText>
            </View>
          ))}
        </View>
      </Card>

      <Card variant="soft">
        <ThemedText type="small" themeColor="textSecondary">
          Esta acción borra todos los datos funcionales del producto. Si el servidor no puede completar alguna parte, la app te lo va a informar sin dejar el resultado ambiguo.
        </ThemedText>
        <Pressable
          onPress={() => setConfirmStep(1)}
          style={({ pressed }) => [
            styles.dangerButton,
            { backgroundColor: theme.accentSoft },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={[styles.dangerText, { color: theme.accent }]}>
            Reiniciar todos los datos
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
                <SectionHeader title="¿Querés borrar todo?" />
                <ThemedText type="small" themeColor="textSecondary">
                  Se eliminarán movimientos, ahorro, metas, plan semanal, calendario, cuotas, recurrentes y datos de Duo. Tu cuenta y tu sesión se conservan.
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
                      Continuar
                    </ThemedText>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <SectionHeader title="Confirmación final" />
                <ThemedText type="small" themeColor="textSecondary">
                  Escribí "SI" para confirmar. No hay forma de volver atrás.
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
                      {
                        backgroundColor: theme.accent,
                        opacity: confirmText.trim().toUpperCase() === 'SI' && !isResetting ? 1 : 0.5,
                      },
                      pressed && styles.pressed,
                    ]}>
                    {isResetting ? (
                      <ActivityIndicator size="small" color={theme.onBrand} />
                    ) : (
                      <ThemedText type="smallBold" style={{ color: theme.onBrand }}>
                        Borrar todo
                      </ThemedText>
                    )}
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
    marginTop: Spacing.two,
  },
  list: {
    marginTop: Spacing.two,
    gap: Spacing.one,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
  },
  listContent: {
    flex: 1,
    gap: 2,
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
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  dangerText: {
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.8,
  },
});
