import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { getHasSeenOnboarding } from '@/constants/launch-state';

function LaunchGate() {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (getHasSeenOnboarding()) {
      return;
    }

    const root = segments[0];
    if (root !== 'onboarding') {
      router.replace('/onboarding');
    }
  }, [segments, router]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <LaunchGate />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="add-transaction" />
        <Stack.Screen name="savings-goals" />
        <Stack.Screen name="instant-duo" />
      </Stack>
    </ThemeProvider>
  );
}
