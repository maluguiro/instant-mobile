import { useCallback, useEffect, useState } from 'react';

import {
  DuoState,
  getCachedDuoState,
  loadDuoState,
  refreshDuo,
  setActiveDuoContext,
  subscribeDuo,
} from '@/lib/duo';

export function useDuo() {
  const [state, setState] = useState<DuoState>(getCachedDuoState());

  const refresh = useCallback(async () => {
    const next = await refreshDuo();
    setState(next);
    return next;
  }, []);

  const setContext = useCallback(async (next: 'personal' | 'duo') => {
    const updated = await setActiveDuoContext(next);
    setState(updated);
  }, []);

  useEffect(() => {
    loadDuoState().then(setState);
    refreshDuo().then(setState).catch(() => {});
    return subscribeDuo(setState);
  }, []);

  return {
    state,
    refresh,
    setContext,
  };
}
