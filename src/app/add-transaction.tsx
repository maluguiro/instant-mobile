import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { frequentCategories, paymentMethods } from '@/constants/mock-data';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AddTransactionScreen() {
  const [type, setType] = useState<'gasto' | 'ingreso'>('gasto');
  const theme = useTheme();

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Nuevo movimiento</ThemedText>
        <ThemedText themeColor="textSecondary">
          Cargá un gasto o ingreso rápido y seguí tu día.
        </ThemedText>
      </View>

      <View style={styles.segmented}>
        {([
          { key: 'gasto', label: 'Gasto', hint: 'Salida de dinero' },
          { key: 'ingreso', label: 'Ingreso', hint: 'Entrada de dinero' },
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
              <ThemedText type="small" themeColor="textSecondary">
                {option.hint}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.amountCard}>
        <SectionHeader title="Monto" />
        <View style={styles.amountRow}>
          <ThemedText type="subtitle" style={styles.currency}>
            $
          </ThemedText>
          <TextInput
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
            style={[styles.amountInput, { color: theme.text }]}
            keyboardType="numeric"
          />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Tip: podés escribir solo números.
        </ThemedText>
      </Card>

      <Card variant="soft">
        <SectionHeader title="Categorías frecuentes" />
        <View style={styles.chips}>
          {frequentCategories.map((category) => (
            <Pill key={category} label={category} />
          ))}
        </View>
      </Card>

      <View style={styles.inlineCards}>
        <Card style={styles.inlineCard}>
          <SectionHeader title="Fecha" />
          <TextInput
            placeholder="Hoy"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
        </Card>
        <Card style={styles.inlineCard} variant="soft">
          <SectionHeader title="Método" />
          <View style={styles.chipsCompact}>
            {paymentMethods.map((method) => (
              <Pill key={method} label={method} />
            ))}
          </View>
        </Card>
      </View>

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
    paddingHorizontal: Spacing.two,
    borderRadius: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    gap: 4,
  },
  amountCard: {
    gap: Spacing.two,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  currency: {
    fontSize: 28,
  },
  amountInput: {
    flex: 1,
    fontSize: 34,
    fontWeight: 700,
  },
  chips: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  inlineCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  inlineCard: {
    flex: 1,
    minWidth: 170,
  },
  input: {
    marginTop: Spacing.two,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    fontWeight: 600,
  },
  chipsCompact: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
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
