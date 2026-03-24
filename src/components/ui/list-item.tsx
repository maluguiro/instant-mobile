import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type ListItemProps = {
  title: string;
  subtitle?: string;
  trailing?: string;
  onPress?: () => void;
};

export function ListItem({ title, subtitle, trailing, onPress }: ListItemProps) {
  const Container = onPress ? Pressable : View;
  return (
    <Container style={styles.container} onPress={onPress}>
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
    </Container>
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
