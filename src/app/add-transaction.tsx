import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { frequentCategories, paymentMethods } from '@/constants/mock-data';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AddTransactionScreen() {
  const [type, setType] = useState<'gasto' | 'ingreso'>('gasto');
  const theme = useTheme();

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Agregar movimiento</ThemedText>
        <ThemedText themeColor="textSecondary">
          Registrá un gasto o ingreso en segundos.
        </ThemedText>
      </View>

      <View style={styles.segmented}>
        {([
          { key: 'gasto', label: 'Gasto' },
          { key: 'ingreso', label: 'Ingreso' },
        ] as const).map((option) => {
          const isActive = type === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => setType(option.key)}
              style={[
                styles.segmentButton,
                {
                  backgroundColor: isActive ? theme.brandSoft : theme.backgroundElement,
                  borderColor: isActive ? theme.brand : theme.border,
                },
              ]}>
              <ThemedText type="smallBold">{option.label}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          Monto
        </ThemedText>
        <TextInput
          placeholder="$0"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />
      </Card>

      <Card variant="soft">
        <ThemedText type="small" themeColor="textSecondary">
          Categoría
        </ThemedText>
        <View style={styles.chips}>
          {frequentCategories.map((category) => (
            <Pill key={category} label={category} />
          ))}
        </View>
      </Card>

      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          Fecha
        </ThemedText>
        <TextInput
          placeholder="Hoy"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />
      </Card>

      <Card variant="soft">
        <ThemedText type="small" themeColor="textSecondary">
          Método de pago
        </ThemedText>
        <View style={styles.chips}>
          {paymentMethods.map((method) => (
            <Pill key={method} label={method} />
          ))}
        </View>
      </Card>

      <Pressable
        onPress={() => router.back()}
        style={[styles.saveButton, { backgroundColor: theme.brand }]}>
        <ThemedText type="smallBold" style={styles.saveText}>
          Guardar movimiento
        </ThemedText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  segmented: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
  },
  input: {
    marginTop: Spacing.two,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 18,
    fontWeight: 600,
  },
  chips: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  saveButton: {
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveText: {
    color: '#ffffff',
    fontSize: 16,
  },
});
