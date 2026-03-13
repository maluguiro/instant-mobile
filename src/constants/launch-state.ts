import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';

export async function getHasSeenOnboarding(): Promise<boolean> {
  return getItem<boolean>(STORAGE_KEYS.onboardingSeen, false);
}

export async function setHasSeenOnboarding(value: boolean): Promise<void> {
  await setItem<boolean>(STORAGE_KEYS.onboardingSeen, value);
}
