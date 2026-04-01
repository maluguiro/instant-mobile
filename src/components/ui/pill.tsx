import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useDuo } from '@/hooks/use-duo';
import { useTheme } from '@/hooks/use-theme';

type PillProps = ViewProps & {
  label: string;
  tone?: 'default' | 'accent';
};

export function Pill({ label, tone = 'default', style, ...rest }: PillProps) {
  const theme = useTheme();
  const { state: duoState } = useDuo();
  const isDuo = duoState.activeContext === 'duo';
  const accent = isDuo ? theme.duoAccent : theme.accent;
  const soft = isDuo ? theme.duoSoft : theme.brandSoft;
  const borderColor = tone === 'accent' ? accent : theme.brand;
  const textColor = accent;

  return (
    <View
      {...rest}
      style={[
        styles.pill,
        { backgroundColor: soft, borderColor },
        style,
      ]}>
      <ThemedText type="small" style={[styles.text, { color: textColor }]}
        >
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
  text: {
    fontWeight: 600,
  },
});
