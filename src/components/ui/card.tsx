import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useDuo } from '@/hooks/use-duo';
import { useTheme } from '@/hooks/use-theme';

type CardProps = ViewProps & {
  variant?: 'default' | 'soft';
};

export function Card({ style, variant = 'default', ...rest }: CardProps) {
  const theme = useTheme();
  const { state } = useDuo();
  const isDuo = state.activeContext === 'duo';
  const backgroundColor = isDuo ? theme.duoSoft : variant === 'soft' ? theme.cardAlt : theme.card;
  const borderColor = isDuo && theme.duoBorder ? theme.duoBorder : isDuo ? theme.duoAccent : theme.border;

  return (
    <View
      {...rest}
      style={[
        styles.card,
        { backgroundColor, borderColor },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.three,
  },
});
