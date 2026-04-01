import { getItem, STORAGE_KEYS } from '@/lib/storage';

type SessionToken = string | null;

let cachedToken: SessionToken = null;

export function getCachedToken(): SessionToken {
  return cachedToken;
}

export async function loadToken(): Promise<SessionToken> {
  const stored = await getItem<SessionToken>(STORAGE_KEYS.auth, null);
  if (stored) {
    cachedToken = stored;
  }
  return cachedToken;
}

export function setCachedToken(token: SessionToken) {
  cachedToken = token;
}
