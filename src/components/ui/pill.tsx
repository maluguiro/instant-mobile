import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PillProps = ViewProps & {
  label: string;
  tone?: 'default' | 'accent';
};

export function Pill({ label, tone = 'default', style, ...rest }: PillProps) {
  const theme = useTheme();
  const backgroundColor = tone === 'accent' ? theme.accentSoft : theme.backgroundSelected;

  return (
    <View
      {...rest}
      style={[styles.pill, { backgroundColor, borderColor: theme.border }, style]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
});
