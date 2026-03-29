import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useDuo } from '@/hooks/use-duo';
import { useTheme } from '@/hooks/use-theme';

export function DuoToggle() {
  const theme = useTheme();
  const { state, setContext } = useDuo();

  const isActive = state.activeContext === 'duo';
  const canUse = state.status === 'member' && Boolean(state.duoId) && !state.closedAt;

  const handlePress = () => {
    if (!canUse) {
      router.push('/instant-duo');
      return;
    }
    setContext(isActive ? 'personal' : 'duo');
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.toggle,
        {
          borderColor: isActive ? theme.duoAccent : theme.border,
          backgroundColor: isActive ? theme.duoSoft : theme.backgroundElement,
        },
        pressed && styles.pressed,
      ]}>
      <View style={styles.row}>
        <Feather name="users" size={14} color={isActive ? theme.duoAccent : theme.textSecondary} />
        <ThemedText type="smallBold" style={{ color: isActive ? theme.duoAccent : theme.textSecondary }}>
          {isActive ? 'Duo' : 'Solo'}
        </ThemedText>
      </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pressed: {
    opacity: 0.85,
  },
});
