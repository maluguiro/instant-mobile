import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppSettings } from '@/hooks/use-app-settings';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  style?: ViewStyle;
};

export function Screen({ children, scroll = true, contentStyle, style }: ScreenProps) {
  useAppSettings();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const containerStyle = [styles.container, { backgroundColor: theme.background }, style];
  const innerStyle = [
    styles.content,
    {
      paddingTop: Math.max(insets.top, Spacing.four),
      paddingBottom: Math.max(insets.bottom, Spacing.four) + BottomTabInset,
      paddingLeft: Math.max(insets.left, Spacing.four),
      paddingRight: Math.max(insets.right, Spacing.four),
    },
    contentStyle,
  ];

  if (!scroll) {
    return (
      <View style={containerStyle}>
        <View style={innerStyle}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView style={containerStyle} contentContainerStyle={innerStyle}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.four,
  },
});
