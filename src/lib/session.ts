import { getItem, STORAGE_KEYS } from '@/lib/storage';

type SessionToken = string | null;

let cachedToken: SessionToken = null;

export function getCachedToken(): SessionToken {
  return cachedToken;
}

export async function loadToken(): Promise<SessionToken> {
  const stored = await getItem<{ token?: SessionToken }>(STORAGE_KEYS.auth, { token: null });
  cachedToken = stored?.token ?? null;
  return cachedToken;
}

export function setCachedToken(token: SessionToken) {
  cachedToken = token;
}
