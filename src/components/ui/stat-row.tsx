import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useDuo } from '@/hooks/use-duo';
import { useTheme } from '@/hooks/use-theme';

type StatRowProps = ViewProps & {
  label: string;
  value: string;
  tone?: 'positive' | 'neutral';
};

export function StatRow({ label, value, tone = 'neutral', style, ...rest }: StatRowProps) {
  const theme = useTheme();
  const { state } = useDuo();
  const isDuo = state.activeContext === 'duo';
  const positiveColor = isDuo ? theme.duoAccent : theme.success;
  const color = tone === 'positive' ? positiveColor : theme.text;

  return (
    <View {...rest} style={[styles.container, style]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText style={[styles.value, { color }]}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  value: {
    fontSize: 18,
    fontWeight: 700,
  },
});
