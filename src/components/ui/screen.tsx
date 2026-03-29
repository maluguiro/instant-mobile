import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppSettings } from '@/hooks/use-app-settings';
import { useDuo } from '@/hooks/use-duo';
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
  const { state: duoState } = useDuo();
  const insets = useSafeAreaInsets();

  const containerStyle = [styles.container, { backgroundColor: theme.background }, style];
  const innerStyle = [
    styles.content,
    {
      paddingTop: Math.max(insets.top, Spacing.five),
      paddingBottom: Math.max(insets.bottom, Spacing.four) + BottomTabInset,
      paddingLeft: Math.max(insets.left, Spacing.four),
      paddingRight: Math.max(insets.right, Spacing.four),
    },
    contentStyle,
  ];

  const showDuo = duoState.activeContext === 'duo' && Boolean(duoState.duoId);
  const duoBadge = showDuo ? (
    <View style={[styles.duoBadge, { borderColor: theme.duoAccent, backgroundColor: theme.duoSoft }]}>
      <ThemedText type="smallBold" style={{ color: theme.duoAccent }}>
        Duo activo
      </ThemedText>
    </View>
  ) : null;

  if (!scroll) {
    return (
      <View style={containerStyle}>
        <View style={innerStyle}>
          {duoBadge}
          {children}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={containerStyle} contentContainerStyle={innerStyle}>
      {duoBadge}
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
  duoBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
});
