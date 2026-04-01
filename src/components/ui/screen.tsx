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

  const duoBackground = duoState.activeContext === 'duo' ? theme.duoBackground : theme.background;
  const containerStyle = [styles.container, { backgroundColor: duoBackground }, style];
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
  const duoStrip = showDuo ? (
    <View style={[styles.duoStrip, { backgroundColor: theme.duoSoft, borderColor: theme.duoBorder }]}>
      <View style={styles.duoStripInner}>
        <View style={[styles.duoDot, { backgroundColor: theme.duoAccent }]} />
        <View style={styles.duoStripText}>
          <ThemedText type="smallBold" style={{ color: theme.text }}>
            Estás en Instant Duo
          </ThemedText>
        </View>
      </View>
    </View>
  ) : null;

  if (!scroll) {
    return (
      <View style={containerStyle}>
        <View style={innerStyle}>
          {duoStrip}
          {children}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={containerStyle} contentContainerStyle={innerStyle}>
      {duoStrip}
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
  duoStrip: {
    alignSelf: 'stretch',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
  },
  duoStripInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  duoDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  duoStripText: {
    flex: 1,
  },
});


