import { Modal, Pressable, StyleSheet, View } from 'react-native';
import React, { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { SelectableOption } from '@/components/ui/selectable-option';
import { Spacing } from '@/constants/theme';
import { CurrencyCode } from '@/lib/app-settings';
import { useTheme } from '@/hooks/use-theme';

const CURRENCIES: CurrencyCode[] = ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'UYU'];

type CurrencySelectProps = {
  value: CurrencyCode;
  onChange: (next: CurrencyCode) => void;
  label?: string;
  compact?: boolean;
  style?: ViewStyle;
};

export function CurrencySelect({
  value,
  onChange,
  label = 'Moneda',
  compact = false,
  style,
}: CurrencySelectProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          compact && styles.triggerCompact,
          { borderColor: theme.border, backgroundColor: theme.backgroundElement },
          style,
          pressed && styles.pressed,
        ]}>
        {label ? (
          <ThemedText type="small" themeColor="textSecondary">
            {label}
          </ThemedText>
        ) : null}
        <ThemedText type="smallBold">{value}</ThemedText>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Elegí moneda</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Se aplica solo a este registro.
              </ThemedText>
            </View>
            <View style={styles.options}>
              {CURRENCIES.map((code) => (
                <SelectableOption
                  key={code}
                  label={code}
                  selected={value === code}
                  onPress={() => {
                    onChange(code);
                    setOpen(false);
                  }}
                />
              ))}
            </View>
            <Pressable
              onPress={() => setOpen(false)}
              style={({ pressed }) => [
                styles.outlineButton,
                { borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Listo
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    gap: 2,
    alignItems: 'center',
    minWidth: 72,
  },
  triggerCompact: {
    paddingVertical: Spacing.half,
    minWidth: 68,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  modalCard: {
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalHeader: {
    gap: Spacing.one,
  },
  options: {
    gap: Spacing.two,
  },
  outlineButton: {
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.85,
  },
});
