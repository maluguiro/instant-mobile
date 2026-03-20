import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { updateProfile } from '@/lib/auth';

export default function AccountSecurityScreen() {
  const theme = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    setMessage('');
    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    try {
      await updateProfile({
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Contraseña actualizada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos actualizar la contraseña.');
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Seguridad</ThemedText>
        <ThemedText themeColor="textSecondary">
          Actualizá tu contraseña de forma segura.
        </ThemedText>
      </View>

      <Card variant="soft" style={styles.card}>
        <SectionHeader title="Cambiar contraseña" />
        <View style={styles.fields}>
          <View style={styles.fieldBlock}>
            <ThemedText type="small" themeColor="textSecondary">
              Contraseña actual
            </ThemedText>
            <TextInput
              placeholder="Ingresá tu contraseña actual"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
              ]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
          </View>
          <View style={styles.fieldBlock}>
            <ThemedText type="small" themeColor="textSecondary">
              Nueva contraseña
            </ThemedText>
            <TextInput
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
              ]}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
          </View>
          <View style={styles.fieldBlock}>
            <ThemedText type="small" themeColor="textSecondary">
              Confirmación
            </ThemedText>
            <TextInput
              placeholder="Repetí la nueva contraseña"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
              ]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>
        </View>
        {error ? (
          <ThemedText type="small" style={{ color: theme.accent }}>
            {error}
          </ThemedText>
        ) : null}
        {message ? (
          <ThemedText type="small" themeColor="textSecondary">
            {message}
          </ThemedText>
        ) : null}
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.brand },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={[styles.primaryText, { color: theme.onBrand }]}>
            Guardar cambios
          </ThemedText>
        </Pressable>
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
    gap: Spacing.two,
  },
  fields: {
    gap: Spacing.one + 2,
  },
  fieldBlock: {
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: Spacing.one + 1,
    paddingHorizontal: Spacing.two,
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    paddingVertical: Spacing.two + 2,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryText: {
    fontSize: 15,
  },
  pressed: {
    opacity: 0.85,
  },
});
