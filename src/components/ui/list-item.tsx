import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type ListItemProps = {
  title: string;
  subtitle?: string;
  trailing?: string;
};

export function ListItem({ title, subtitle, trailing }: ListItemProps) {
  return (
    <View style={styles.container}>
      <View style={styles.texts}>
        <ThemedText>{title}</ThemedText>
        {subtitle && (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        )}
      </View>
      {trailing && (
        <ThemedText type="smallBold" style={styles.trailing}>
          {trailing}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  texts: {
    gap: 2,
    flex: 1,
  },
  trailing: {
    textAlign: 'right',
  },
});
