import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, ImageBackground, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { hasStoredBiometricSession, signOut, signInWithBiometrics } from '@/lib/auth';
import { authenticateWithBiometrics, canUseBiometrics } from '@/lib/biometrics';

export default function EntryScreen() {
  const theme = useTheme();
  const { user, loading, biometricsEnabled } = useAuth();
  const [biometricVisible, setBiometricVisible] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (loading) return;

    let active = true;

    Promise.all([canUseBiometrics(), hasStoredBiometricSession()]).then(
      ([available, hasStoredSession]) => {
        if (!active) return;
        setBiometricVisible(Boolean(biometricsEnabled || hasStoredSession || available));
      }
    );

    return () => {
      active = false;
    };
  }, [loading, biometricsEnabled]);

  const greetingName = useMemo(() => user?.name ?? '', [user?.name]);

  const handleBiometricPress = async () => {
    setMessage('');
    const result = await authenticateWithBiometrics();
    if (!result.success) {
      setMessage('No se pudo validar la biometría.');
      return;
    }
    try {
      await signInWithBiometrics();
      router.replace('/(tabs)');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No hay una sesión guardada para usar biometría.'
      );
    }
  };

  const handleSwap = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <ImageBackground
      source={require('../imagenes/entry-bg.jpg')}
      style={styles.background}
      resizeMode="cover">
      <View style={styles.overlay} />
      <Screen scroll={false} style={styles.screen} contentStyle={styles.container}>
        <View style={styles.containerInner}>
          <View style={styles.brandBlock}>
            <View style={styles.logoShell}>
              <Image
                source={require('../imagenes/icono-instant.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.greetingBlock}>
              <ThemedText type="subtitle" style={styles.greetingText}>
                Hola, {greetingName}
              </ThemedText>
              <Pressable onPress={handleSwap} style={styles.swapButton}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  No soy yo
                </ThemedText>
              </Pressable>
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
              <ThemedText type="smallBold" style={[styles.primaryText, { color: theme.onBrand }]}>
                Iniciar sesión
              </ThemedText>
            </Pressable>
            {biometricVisible ? (
              <Pressable
                onPress={handleBiometricPress}
                style={({ pressed }) => [
                  styles.biometricButton,
                  { backgroundColor: theme.brand },
                  pressed && styles.pressed,
                ]}>
                <MaterialCommunityIcons name="fingerprint" size={22} color={theme.onBrand} />
              </Pressable>
            ) : null}
            {message ? (
              <ThemedText type="small" style={[styles.messageText, { color: theme.accent }]}>
                {message}
              </ThemedText>
            ) : null}
          </View>
        </View>
      </Screen>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(247, 239, 233, 0.6)',
  },
  screen: {
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: Spacing.five,
  },
  containerInner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  brandBlock: {
    alignItems: 'center',
    marginTop: Spacing.five,
    gap: Spacing.three,
  },
  logoShell: {
    width: 240,
    height: 240,
    borderRadius: 140,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  greetingBlock: {
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  greetingText: {
    color: '#4A2E24',
  },
  swapButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actions: {
    gap: Spacing.two,
  },
  messageText: {
    textAlign: 'center',
  },
  primaryButton: {
    paddingVertical: Spacing.three,
    borderRadius: 28,
    alignItems: 'center',
  },
  primaryText: {
    fontSize: 15,
  },
  biometricButton: {
    alignSelf: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});

