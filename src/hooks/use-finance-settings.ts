import { useCallback, useState } from 'react';

import {
  defaultFinanceSettings,
  FinanceSettings,
  getFinanceSettings,
  saveFinanceSettings,
} from '@/lib/finance-settings';

export function useFinanceSettings() {
  const [settings, setSettings] = useState<FinanceSettings>(defaultFinanceSettings);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getFinanceSettings();
    setSettings(data);
    setLoading(false);
  }, []);

  const update = useCallback(async (next: FinanceSettings) => {
    await saveFinanceSettings(next);
    setSettings(next);
  }, []);

  return { settings, loading, refresh, update };
}
