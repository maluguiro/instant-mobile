import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAppSettings } from '@/hooks/use-app-settings';
import { useDuo } from '@/hooks/use-duo';
import {
  defaultFinanceSettingsStore,
  FinanceSettings,
  FinanceSettingsStore,
  getFinanceSettingsStore,
  getFinanceSettingsCurrencies,
  resolveFinanceSettings,
  saveFinanceSettings,
  saveFinanceSettingsStore,
  setFinanceSettingsSelectedCurrency,
} from '@/lib/finance-settings';
import { CurrencyCode } from '@/lib/app-settings';

export function useFinanceSettings() {
  const { state: duoState } = useDuo();
  const { settings: appSettings } = useAppSettings();
  const [store, setStore] = useState<FinanceSettingsStore>(defaultFinanceSettingsStore);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getFinanceSettingsStore();
    setStore(data);
    setLoading(false);
  }, []);

  const selectedCurrency = store.selectedCurrency ?? appSettings.currency;

  const settings = useMemo(
    () => resolveFinanceSettings(store, selectedCurrency),
    [store, selectedCurrency]
  );

  const update = useCallback(
    async (next: FinanceSettings, currency?: CurrencyCode) => {
      const resolvedCurrency = currency ?? selectedCurrency;
      await saveFinanceSettings(next, resolvedCurrency);
      setStore((prev) => ({
        ...prev,
        selectedCurrency: resolvedCurrency,
        currencies: {
          ...prev.currencies,
          [resolvedCurrency]: next,
        },
      }));
    },
    [selectedCurrency]
  );

  const setSelectedCurrency = useCallback(async (currency: CurrencyCode) => {
    const nextStore = await setFinanceSettingsSelectedCurrency(currency);
    setStore(nextStore);
  }, []);

  const getSettingsForCurrency = useCallback(
    (currency: CurrencyCode) => resolveFinanceSettings(store, currency),
    [store]
  );

  const replaceStore = useCallback(async (next: FinanceSettingsStore) => {
    await saveFinanceSettingsStore(next);
    setStore(next);
  }, []);

  const currencies = useMemo(() => {
    const items = getFinanceSettingsCurrencies(store);
    if (items.includes(appSettings.currency)) return items;
    return [appSettings.currency, ...items.filter((currency) => currency !== appSettings.currency)];
  }, [store, appSettings.currency]);

  useEffect(() => {
    refresh();
  }, [duoState.activeContext, duoState.duoId, refresh]);

  return {
    store,
    settings,
    loading,
    refresh,
    update,
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    getSettingsForCurrency,
    replaceStore,
  };
}
