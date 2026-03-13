import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onPress?: () => void;
};

export function SectionHeader({ title, actionLabel, onPress }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {actionLabel && onPress && (
        <Pressable onPress={onPress}>
          <ThemedText type="small" themeColor="brand">
            {actionLabel}
          </ThemedText>
        </Pressable>
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
});
