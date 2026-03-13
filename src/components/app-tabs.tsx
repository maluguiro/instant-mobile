import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <NativeTabs
        backgroundColor={colors.background}
        indicatorColor={colors.backgroundSelected}
        labelStyle={{ selected: { color: colors.text } }}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('@/assets/images/tabIcons/home.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="movements">
          <NativeTabs.Trigger.Label>Movimientos</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('@/assets/images/tabIcons/explore.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="budget">
          <NativeTabs.Trigger.Label>Presupuesto</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('@/assets/images/tabIcons/explore.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="calendar">
          <NativeTabs.Trigger.Label>Calendario</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('@/assets/images/tabIcons/explore.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Label>Ajustes</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('@/assets/images/tabIcons/explore.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>
      </NativeTabs>

      <Pressable
        onPress={() => router.push('/add-transaction')}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.brand,
            bottom: Math.max(insets.bottom, 12) + 28,
            opacity: pressed ? 0.9 : 1,
          },
        ]}>
        <ThemedText style={styles.fabText}>+</ThemedText>
        <ThemedView
          style={[styles.fabLabel, { backgroundColor: colors.brandSoft }]}
          type="background">
          <ThemedText type="smallBold" style={styles.fabLabelText}>
            Agregar
          </ThemedText>
        </ThemedView>
      </Pressable>
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
    color: '#1E1A17',
  },
});
