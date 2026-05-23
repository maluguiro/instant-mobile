import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiRequest } from '@/lib/api';
import { getCachedAuthState, loadAuthState } from '@/lib/auth';
import { resetDuoState } from '@/lib/duo';
import { STORAGE_KEYS } from '@/lib/storage';

export type ClearUserDataResult = {
  status: 'success' | 'partial';
  localCleared: boolean;
  remoteCleared: boolean;
  warnings: string[];
};

async function getAuthToken() {
  const cached = getCachedAuthState();
  if (cached.token) return cached.token;
  const loaded = await loadAuthState();
  return loaded.token;
}

function isAuthError(message: string) {
  return (
    message.includes('Token') ||
    message.includes('401') ||
    message.includes('403') ||
    message.includes('inválido') ||
    message.includes('invÃ¡lido')
  );
}

function isUnsupportedRemoteStorage(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('almacenamiento remoto') && normalized.includes('no est');
}

async function clearAllBackendData(token: string): Promise<{ ok: boolean; warnings: string[] }> {
  const warnings: string[] = [];

  const run = async (label: string, path: string, method: 'DELETE' | 'POST') => {
    try {
      await apiRequest(path, { method, token });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (label === 'calendar' && isUnsupportedRemoteStorage(msg)) {
        return;
      }
      warnings.push(`${label}: ${msg}`);
    }
  };

  await run('transactions', '/transactions/clear', 'DELETE');
  await run('categories', '/categories/clear', 'DELETE');
  await run('payment-methods', '/payment-methods/clear', 'DELETE');
  await run('duo', '/duo/reset', 'POST');
  await run('calendar', '/calendar/clear', 'DELETE');

  return {
    ok: warnings.length === 0,
    warnings,
  };
}

async function clearAllLocalData(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const keysToPreserve = [STORAGE_KEYS.auth, STORAGE_KEYS.biometricToken];
  const keysToRemove = allKeys.filter((key) => !keysToPreserve.includes(key as (typeof keysToPreserve)[number]));
  if (keysToRemove.length > 0) {
    await AsyncStorage.multiRemove(keysToRemove);
  }
}

async function clearPendingQueues(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const pendingKeys = allKeys.filter((key) => key.includes('pending'));
  if (pendingKeys.length > 0) {
    await AsyncStorage.multiRemove(pendingKeys);
  }
}

export async function clearUserData(): Promise<ClearUserDataResult> {
  await clearPendingQueues();

  const token = await getAuthToken();
  const warnings: string[] = [];
  let remoteCleared = !token;

  if (token) {
    const backend = await clearAllBackendData(token);
    remoteCleared = backend.ok;
    warnings.push(...backend.warnings);
  }

  try {
    await clearAllLocalData();
    await resetDuoState();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`local: ${msg}`);
  }

  return {
    status: warnings.length > 0 ? 'partial' : 'success',
    localCleared: true,
    remoteCleared,
    warnings: warnings.map((warning) => {
      if (isAuthError(warning)) {
        return `${warning} (la sesión se conservó; puede quedar limpieza remota pendiente)`;
      }
      return warning;
    }),
  };
}
