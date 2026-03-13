import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type ProgressBarProps = {
  value: number;
};

export function ProgressBar({ value }: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.min(Math.max(value, 0), 1);

  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped * 100}%`, backgroundColor: theme.brand },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
