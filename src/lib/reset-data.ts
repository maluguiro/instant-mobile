import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { getCachedAuthState, invalidateSession, loadAuthState } from '@/lib/auth';
import { resetDuoState } from '@/lib/duo';
import { STORAGE_KEYS } from '@/lib/storage';

async function getAuthToken() {
  const cached = getCachedAuthState();
  if (cached.token) return cached.token;
  const loaded = await loadAuthState();
  return loaded.token;
}

async function clearAllBackendData(token: string): Promise<void> {
  const authErrors: string[] = [];
  const softErrors: string[] = [];

  try {
    await apiRequest('/transactions/clear', { method: 'DELETE', token });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Token') || msg.includes('401') || msg.includes('403') || msg.includes('inválido')) {
      authErrors.push(msg);
    } else {
      softErrors.push(`transactions: ${msg}`);
    }
  }

  try {
    await apiRequest('/categories/clear', { method: 'DELETE', token });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Token') || msg.includes('401') || msg.includes('403') || msg.includes('inválido')) {
      authErrors.push(msg);
    } else {
      softErrors.push(`categories: ${msg}`);
    }
  }

  try {
    await apiRequest('/payment-methods/clear', { method: 'DELETE', token });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Token') || msg.includes('401') || msg.includes('403') || msg.includes('inválido')) {
      authErrors.push(msg);
    } else {
      softErrors.push(`payment-methods: ${msg}`);
    }
  }

  try {
    await apiRequest('/duo/reset', { method: 'POST', token });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Token') || msg.includes('401') || msg.includes('403') || msg.includes('inválido')) {
      authErrors.push(msg);
    } else {
      softErrors.push(`duo: ${msg}`);
    }
  }

  if (authErrors.length > 0) {
    throw new Error(`Token inválido: ${authErrors[0]}`);
  }

  if (softErrors.length > 0) {
    throw new Error(`Errores en servidor: ${softErrors.join(', ')}`);
  }
}

async function clearAllLocalData(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const keysToPreserve = [STORAGE_KEYS.auth, STORAGE_KEYS.biometricToken];
  const keysToRemove = allKeys.filter(
    (key) => !keysToPreserve.some((k) => key === k)
  );
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

export async function clearUserData(): Promise<void> {
  await clearPendingQueues();

  const token = await getAuthToken();

  if (token) {
    try {
      await clearAllBackendData(token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Token') || msg.includes('inválido') || msg.includes('401') || msg.includes('403')) {
        await invalidateSession();
      }
      throw err;
    }
  }

  await clearAllLocalData();
  await resetDuoState();
}
