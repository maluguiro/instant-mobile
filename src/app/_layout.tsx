import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';


import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { getHasSeenOnboarding } from '@/constants/launch-state';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { getNotifications, scheduleLocalNotifications, scheduleSnoozeNotification } from '@/lib/notifications';

function LaunchGate() {
  const segments = useSegments();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const seen = await getHasSeenOnboarding();
      if (!mounted) return;
      if (!seen) {
        const root = segments[0];
        if (root !== 'onboarding') {
          router.replace('/onboarding');
        }
      }
      setChecked(true);
    };

    check();
    return () => {
      mounted = false;
    };
  }, [segments, router]);

  if (!checked) {
    return null;
  }

  return null;
}

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const root = segments[0];
    const authRoutes = ['auth', 'login', 'signup', 'reset-password'];
    const entryRoute = 'entry';
    const publicRoutes = ['onboarding', entryRoute, ...authRoutes];

    if (!root) return;

    if (!user && !publicRoutes.includes(root)) {
      router.replace('/auth');
      return;
    }

    if (user && (authRoutes.includes(root) || root === entryRoute)) {
      router.replace('/(tabs)');
    }
  }, [loading, user, segments, router]);

  if (loading) return null;
  return null;
}

function NotificationsGate() {
  const router = useRouter();

  useEffect(() => {
    try {
      const Notifications = getNotifications();
      if (!Notifications) return;

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });

      Notifications.setNotificationCategoryAsync('instant-snooze', [
        { identifier: 'snooze-1h', buttonTitle: 'Posponer 1h', options: { opensAppToForeground: false } },
        { identifier: 'snooze-3h', buttonTitle: 'Posponer 3h', options: { opensAppToForeground: false } },
        { identifier: 'snooze-tomorrow', buttonTitle: 'Mañana', options: { opensAppToForeground: false } },
      ]);

      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const action = response.actionIdentifier;
        const content = response.notification.request.content;

        if (action === 'snooze-1h' || action === 'snooze-3h') {
          const hours = action === 'snooze-1h' ? 1 : 3;
          const trigger = new Date(Date.now() + hours * 60 * 60 * 1000);
          scheduleSnoozeNotification(
            {
              title: content.title ?? 'Recordatorio',
              body: content.body ?? '',
              data: content.data as Record<string, unknown>,
              categoryIdentifier: content.categoryIdentifier ?? undefined,
            },
            trigger
          );
          return;
        }

        if (action === 'snooze-tomorrow') {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0);
          scheduleSnoozeNotification(
            {
              title: content.title ?? 'Recordatorio',
              body: content.body ?? '',
              data: content.data as Record<string, unknown>,
              categoryIdentifier: content.categoryIdentifier ?? undefined,
            },
            tomorrow
          );
          return;
        }

        const data = response.notification.request.content.data as {
          route?: string;
          params?: Record<string, string>;
        };
        if (data?.route) {
          router.push({ pathname: data.route, params: data.params ?? {} });
        }
      });

      scheduleLocalNotifications();

      return () => {
        subscription.remove();
      };
    } catch {
      return;
    }
  }, [router]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <LaunchGate />
      <AuthGate />
      <NotificationsGate />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="entry" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="add-transaction" />
        <Stack.Screen name="new-movement" />
        <Stack.Screen name="savings-goals" />
        <Stack.Screen name="instant-duo" />
      </Stack>
    </ThemeProvider>
  );
}


