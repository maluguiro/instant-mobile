import { getItem, removeItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { setCachedToken } from '@/lib/session';
import { resetDuoState } from '@/lib/duo';
import { apiRequest } from '@/lib/api';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  biometricsEnabled: boolean;
};

const listeners = new Set<(state: AuthState) => void>();
let cachedState: AuthState = { token: null, user: null, biometricsEnabled: false };

function notify(next: AuthState) {
  listeners.forEach((listener) => listener(next));
}

function normalizeState(state: AuthState): AuthState {
  const normalized = {
    token: state.token ?? null,
    user: state.user ?? null,
    biometricsEnabled: state.biometricsEnabled ?? false,
  };
  if (!normalized.token) {
    normalized.user = null;
  }
  return normalized;
}

export function getCachedAuthState() {
  return cachedState;
}

export function subscribeAuth(listener: (state: AuthState) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function loadAuthState(): Promise<AuthState> {
  const stored = await getItem<AuthState>(STORAGE_KEYS.auth, {
    token: null,
    user: null,
    biometricsEnabled: false,
  });
  cachedState = normalizeState(stored);
  return cachedState;
}

export async function saveAuthState(state: AuthState) {
  const normalized = normalizeState(state);
  cachedState = normalized;
  await setItem<AuthState>(STORAGE_KEYS.auth, normalized);
  setCachedToken(normalized.token ?? null);
  if (normalized.biometricsEnabled) {
    if (normalized.token) {
      await setItem<string>(STORAGE_KEYS.biometricToken, normalized.token);
    }
  } else {
    await removeItem(STORAGE_KEYS.biometricToken);
  }
  notify(normalized);
}

export async function signUp(name: string, email: string, password: string) {
  const response = await apiRequest<{ token: string; user: AuthUser }>('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });

  await saveAuthState({
    token: response.token,
    user: response.user,
    biometricsEnabled: cachedState.biometricsEnabled,
  });

  return response.user;
}

export async function signIn(email: string, password: string) {
  const response = await apiRequest<{ token: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  await saveAuthState({
    token: response.token,
    user: response.user,
    biometricsEnabled: cachedState.biometricsEnabled,
  });

  return response.user;
}

async function fetchProfileWithToken(token: string) {
  return apiRequest<AuthUser>('/me', { method: 'GET', token });
}

export async function fetchProfile() {
  const state = await loadAuthState();
  if (!state.token) {
    return null;
  }
  try {
    const user = await fetchProfileWithToken(state.token);
    await saveAuthState({ ...state, user });
    return user;
  } catch {
    return null;
  }
}

export async function updateProfile(payload: {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}) {
  const state = await loadAuthState();
  if (!state.token) {
    throw new Error('No hay sesión activa.');
  }
  const user = await apiRequest<AuthUser>('/me', {
    method: 'PUT',
    token: state.token,
    body: payload,
  });
  await saveAuthState({ ...state, user });
  return user;
}

export async function signInWithBiometrics() {
  const state = await loadAuthState();
  let token = state.token;
  if (!token) {
    token = await getItem<string | null>(STORAGE_KEYS.biometricToken, null);
  }
  if (!token) {
    throw new Error('No hay sesión guardada para usar biometría.');
  }
  const user = await fetchProfileWithToken(token);
  await saveAuthState({ token, user, biometricsEnabled: state.biometricsEnabled });
  return user;
}

export async function hasStoredBiometricSession() {
  const state = await loadAuthState();
  if (state.token) {
    return true;
  }
  const biometricToken = await getItem<string | null>(STORAGE_KEYS.biometricToken, null);
  return Boolean(biometricToken);
}

export async function setBiometricsEnabled(enabled: boolean) {
  const state = await loadAuthState();
  if (enabled && state.token) {
    await setItem<string>(STORAGE_KEYS.biometricToken, state.token);
  }
  if (!enabled) {
    await removeItem(STORAGE_KEYS.biometricToken);
  }
  await saveAuthState({ ...state, biometricsEnabled: enabled });
}

export async function requestPasswordReset(email: string) {
  // Placeholder: endpoint real se agrega en backend futuro.
  return { ok: Boolean(email.trim()) };
}

export async function signOut() {
  const state = await loadAuthState();
  if (state.biometricsEnabled && state.token) {
    await setItem<string>(STORAGE_KEYS.biometricToken, state.token);
  }
  await saveAuthState({ token: null, user: null, biometricsEnabled: state.biometricsEnabled });
  await resetDuoState();
  await setItem(STORAGE_KEYS.transactions, []);
}

export async function lockSession() {
  const state = await loadAuthState();
  await saveAuthState({ token: state.token ?? null, user: null, biometricsEnabled: state.biometricsEnabled });
}

export async function invalidateSession() {
  const state = await loadAuthState();
  await saveAuthState({ token: null, user: null, biometricsEnabled: state.biometricsEnabled });
  await resetDuoState();
}








