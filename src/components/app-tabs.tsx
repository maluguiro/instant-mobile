import { Feather } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import React from 'react';
import { Animated, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const insets = useSafeAreaInsets();
  const fabBottom = BottomTabInset + Math.max(insets.bottom, 10) + 10;
  const fabScale = React.useRef(new Animated.Value(1)).current;

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            height: 64 + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 8),
            paddingTop: 8,
          },
          tabBarActiveTintColor: colors.text,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Feather name="home" size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="movements"
          options={{
            title: 'Movimientos',
            tabBarIcon: ({ color }) => <Feather name="list" size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="budget"
          options={{
            title: 'Presupuesto',
            tabBarIcon: ({ color }) => <Feather name="pie-chart" size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendario',
            tabBarIcon: ({ color }) => <Feather name="calendar" size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Ajustes',
            tabBarIcon: ({ color }) => <Feather name="settings" size={20} color={color} />,
          }}
        />
      </Tabs>

      <Animated.View style={{ transform: [{ scale: fabScale }] }}>
        <Pressable
          onPress={() => router.push('/add-transaction')}
          onPressIn={() => {
            Animated.spring(fabScale, {
              toValue: 0.97,
              useNativeDriver: true,
              speed: 28,
              bounciness: 0,
            }).start();
          }}
          onPressOut={() => {
            Animated.spring(fabScale, {
              toValue: 1,
              useNativeDriver: true,
              speed: 28,
              bounciness: 0,
            }).start();
          }}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: colors.brand,
              bottom: fabBottom,
              opacity: pressed ? 0.92 : 1,
            },
          ]}>
          <ThemedText style={[styles.fabText, { color: colors.onBrand }]}>+</ThemedText>
          <ThemedView style={[styles.fabLabel, { backgroundColor: colors.brandSoft }]}>
            <Text style={styles.fabLabelText}>Agregar</Text>
          </ThemedView>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 700,
  },
  fabLabel: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  fabLabelText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#1f1b18',
  },
});
