import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardProps = ViewProps & {
  variant?: 'default' | 'soft';
};

export function Card({ style, variant = 'default', ...rest }: CardProps) {
  const theme = useTheme();
  const backgroundColor = variant === 'soft' ? theme.cardAlt : theme.card;

  return (
    <View
      {...rest}
      style={[
        styles.card,
        { backgroundColor, borderColor: theme.border },
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
