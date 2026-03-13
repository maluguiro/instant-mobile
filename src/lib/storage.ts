import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  onboardingSeen: 'instant:onboarding_seen',
  transactions: 'instant:transactions',
} as const;

export async function getItem<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value === null) {
      return fallback;
    }
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore for now
  }
}
