import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAppSettings } from '@/hooks/use-app-settings';
import { useTheme } from '@/hooks/use-theme';

export function ThemeToggle() {
  const theme = useTheme();
  const { settings, update } = useAppSettings();
  const isDark = settings.theme === 'dark';

  return (
    <Pressable
      onPress={() => update({ theme: isDark ? 'light' : 'dark' })}
      style={({ pressed }) => [
        styles.toggle,
        { borderColor: theme.border, backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>
        {isDark ? '☾' : '☀︎'}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  pressed: {
    opacity: 0.85,
  },
});
