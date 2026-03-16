import { useCallback, useEffect, useState } from 'react';

import {
  AppSettings,
  defaultAppSettings,
  getAppSettings,
  subscribeAppSettings,
  updateAppSettings,
} from '@/lib/app-settings';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);

  const refresh = useCallback(async () => {
    const next = await getAppSettings();
    setSettings(next);
  }, []);

  const update = useCallback(async (partial: Partial<AppSettings>) => {
    const next = await updateAppSettings(partial);
    setSettings(next);
  }, []);

  useEffect(() => {
    refresh();
    return subscribeAppSettings(setSettings);
  }, [refresh]);

  return { settings, update, refresh };
}
