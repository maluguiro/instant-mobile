import { useCallback, useEffect, useState } from 'react';

import {
  defaultFinanceSettings,
  FinanceSettings,
  getFinanceSettings,
  saveFinanceSettings,
} from '@/lib/finance-settings';
import { useDuo } from '@/hooks/use-duo';

export function useFinanceSettings() {
  const { state: duoState } = useDuo();
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

  useEffect(() => {
    refresh();
  }, [duoState.activeContext, duoState.duoId, refresh]);

  return { settings, loading, refresh, update };
}



