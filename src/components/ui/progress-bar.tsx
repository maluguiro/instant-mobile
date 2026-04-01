import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useDuo } from '@/hooks/use-duo';
import { useTheme } from '@/hooks/use-theme';

type ProgressBarProps = {
  value: number;
};

export function ProgressBar({ value }: ProgressBarProps) {
  const theme = useTheme();
  const { state: duoState } = useDuo();
  const clamped = Math.min(Math.max(value, 0), 1);
  const isDuo = duoState.activeContext === 'duo';
  const fillColor = isDuo ? theme.duoAccent : theme.brand;
  const trackColor = isDuo ? theme.duoBorder ?? theme.backgroundSelected : theme.backgroundSelected;

  return (
    <View style={[styles.track, { backgroundColor: trackColor }]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped * 100}%`, backgroundColor: fillColor },
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
