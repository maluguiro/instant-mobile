import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, ImageBackground, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function EntryScreen() {
  const theme = useTheme();

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
                Hola, {'{nombre}'}
              </ThemedText>
              <Pressable style={styles.swapButton}>
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
            <Pressable style={[styles.biometricButton, { backgroundColor: theme.brand }]}>
              <MaterialCommunityIcons name="fingerprint" size={22} color={theme.onBrand} />
            </Pressable>
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
