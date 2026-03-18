import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { signIn, signInWithBiometrics } from '@/lib/auth';
import { authenticateWithBiometrics, canUseBiometrics } from '@/lib/biometrics';

export default function LoginScreen() {
  const theme = useTheme();
  const { biometricsEnabled } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    canUseBiometrics().then(setBiometricsAvailable);
  }, []);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Ingresá un email válido.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    try {
      await signIn(trimmed, password);
      router.replace('/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos iniciar sesión.');
    }
  };

  const handleBiometricLogin = async () => {
    setError('');
    const result = await authenticateWithBiometrics();
    if (!result.success) {
      setError('No se pudo validar la biometría.');
      return;
    }
    try {
      await signInWithBiometrics();
      router.replace('/account');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No hay una cuenta guardada para usar biometría.'
      );
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Iniciar sesión</ThemedText>
        <ThemedText themeColor="textSecondary">
          Volvé a tu panel con tu información guardada y lista.
        </ThemedText>
      </View>

      <Card variant="soft" style={styles.benefitsCard}>
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
      </Card>

      <Card style={styles.formCard}>
        <SectionHeader title="Tus datos" />
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
        <View style={[styles.inputRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
        >
          <TextInput
            placeholder="Contraseña"
            placeholderTextColor={theme.textSecondary}
            style={[styles.inputInner, { color: theme.text }]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <Pressable onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeButton} hitSlop={8}>
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={theme.textSecondary} />
          </Pressable>
        </View>
        <Pressable
          onPress={() => router.push('/reset-password')}
          style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Olvidé mi contraseña
          </ThemedText>
        </Pressable>
        {error ? (
          <ThemedText type="small" style={{ color: theme.accent }}>
            {error}
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
            Iniciar sesión
          </ThemedText>
        </Pressable>
        {biometricsAvailable && biometricsEnabled ? (
          <Pressable
            onPress={handleBiometricLogin}
            style={({ pressed }) => [
              styles.outlineButton,
              { borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Ingresar con huella
            </ThemedText>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => router.push('/signup')}
          style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Crear cuenta
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
  benefitsCard: {
    gap: Spacing.three,
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
  },
  inputInner: {
    flex: 1,
    paddingVertical: Spacing.two,
    fontSize: 16,
    fontWeight: '600',
  },
  eyeButton: {
    paddingLeft: Spacing.one,
  },
  primaryButton: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
  },
  outlineButton: {
    marginTop: Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
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
