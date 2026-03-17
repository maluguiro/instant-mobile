import React from 'react';
import { LayoutAnimation, Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SelectableOptionProps = {
  label: string;
  description?: string;
  selected?: boolean;
  size?: 'pill' | 'card';
  onPress?: () => void;
  style?: ViewStyle;
};

export function SelectableOption({
  label,
  description,
  selected = false,
  size = 'pill',
  onPress,
  style,
}: SelectableOptionProps) {
  const theme = useTheme();

  const containerStyles = [
    size === 'pill' ? styles.pill : styles.card,
    {
      backgroundColor: selected ? theme.brandSoft : theme.backgroundElement,
      borderColor: selected ? theme.accent : theme.border,
    },
    style,
  ];

  const labelColor = selected ? theme.accent : theme.textSecondary;

  const handlePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onPress?.();
  };

  return (
    <Pressable onPress={handlePress} style={({ pressed }) => [pressed && styles.pressed]}>
      <View style={containerStyles}>
        <View style={styles.textBlock}>
          <ThemedText type="smallBold" style={{ color: labelColor }}>
            {label}
          </ThemedText>
          {description ? (
            <ThemedText type="small" themeColor="textSecondary">
              {description}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
  },
  textBlock: {
    gap: 4,
  },
  pressed: {
    opacity: 0.85,
  },
});
