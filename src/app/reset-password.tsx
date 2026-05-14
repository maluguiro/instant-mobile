import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { requestPasswordReset } from '@/lib/auth';
import { safeGoBack } from '@/lib/navigation';

export default function ResetPasswordScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setStatus('Ingresá un email válido.');
      return;
    }
    await requestPasswordReset(trimmed);
    setStatus(
      'Esta es una simulación local. Si la cuenta existe, vas a recibir instrucciones cuando conectemos el correo.'
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Restablecer contraseña</ThemedText>
        <ThemedText themeColor="textSecondary">
          Recuperá el acceso a tu cuenta de forma segura.
        </ThemedText>
      </View>

      <Card style={styles.formCard}>
        <SectionHeader title="Tu email" />
        <TextInput
          placeholder="Email"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
          ]}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {status ? (
          <ThemedText type="small" themeColor="textSecondary">
            {status}
          </ThemedText>
        ) : null}
        <Pressable
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.brand },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={[styles.primaryText, { color: theme.onBrand }]}>
            Enviar instrucciones
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => safeGoBack('/login')}
          style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Volver a iniciar sesión
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
  formCard: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryText: {
    fontSize: 15,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.85,
  },
});
