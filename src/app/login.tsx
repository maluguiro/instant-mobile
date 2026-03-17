import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { signIn } from '@/lib/auth';

export default function LoginScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Ingresá un email válido.');
      return;
    }
    await signIn(trimmed, name.trim());
    router.replace('/account');
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
        <TextInput
          placeholder="Nombre (opcional)"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
          ]}
          value={name}
          onChangeText={setName}
        />
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
