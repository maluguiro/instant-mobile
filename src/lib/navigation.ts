import { router } from 'expo-router';

export function safeGoBack(fallback = '/(tabs)'): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}

export function safePush(path: string): void {
  router.push(path as any);
}

export function safeReplace(path: string): void {
  router.replace(path as any);
}