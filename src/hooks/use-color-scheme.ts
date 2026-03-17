import { useColorScheme as useNativeColorScheme } from 'react-native';

import { useAppSettings } from '@/hooks/use-app-settings';

export function useColorScheme() {
  const system = useNativeColorScheme() ?? 'light';
  const { settings } = useAppSettings();

  return settings.theme ?? system;
}
