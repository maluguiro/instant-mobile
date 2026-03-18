import AsyncStorage from '@react-native-async-storage/async-storage';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type AuthCredentials = {
  name: string;
  email: string;
  password: string;
};

type AuthState = {
  user: AuthUser | null;
  credentials?: AuthCredentials | null;
  biometricsEnabled?: boolean;
  resetRequestedAt?: string | null;
};

const STORAGE_KEY = 'instant:auth';

const listeners = new Set<(state: AuthState) => void>();
let cachedState: AuthState = { user: null, credentials: null, biometricsEnabled: false, resetRequestedAt: null };

function normalizeState(state: AuthState): AuthState {
  return {
    user: state.user ?? null,
    credentials: state.credentials ?? null,
    biometricsEnabled: state.biometricsEnabled ?? false,
    resetRequestedAt: state.resetRequestedAt ?? null,
  };
}

export async function loadAuthState(): Promise<AuthState> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) {
    cachedState = normalizeState({ user: null });
    return cachedState;
  }
  try {
    const parsed = JSON.parse(stored) as AuthState;
    cachedState = normalizeState(parsed);
    return parsed;
  } catch {
    cachedState = normalizeState({ user: null });
    return cachedState;
  }
}

export function getCachedAuthState() {
  return cachedState;
}

function notify(next: AuthState) {
  listeners.forEach((listener) => listener(next));
}

export function subscribeAuth(listener: (state: AuthState) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function saveAuthState(state: AuthState) {
  const normalized = normalizeState(state);
  cachedState = normalized;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  notify(normalized);
}

export async function signIn(email: string, password: string) {
  const state = await loadAuthState();
  const credentials = state.credentials;
  if (!credentials) {
    throw new Error('No hay una cuenta creada todavía.');
  }
  if (credentials.email !== email.trim() || credentials.password !== password) {
    throw new Error('Email o contraseña incorrectos.');
  }
  const user: AuthUser =
    state.user ??
    ({
      id: String(Date.now()),
      name: credentials.name || email.split('@')[0] || 'Usuario',
      email: credentials.email,
      createdAt: new Date().toISOString(),
    } as AuthUser);
  await saveAuthState({ ...state, user });
  return user;
}

export async function signUp(name: string, email: string, password: string) {
  const state = await loadAuthState();
  const credentials: AuthCredentials = {
    name: name.trim(),
    email: email.trim(),
    password,
  };
  const user: AuthUser = {
    id: String(Date.now()),
    name: name.trim(),
    email: email.trim(),
    createdAt: new Date().toISOString(),
  };
  await saveAuthState({
    ...state,
    user,
    credentials,
    resetRequestedAt: null,
  });
  return user;
}

export async function signInWithBiometrics() {
  const state = await loadAuthState();
  if (!state.credentials) {
    throw new Error('No hay credenciales guardadas.');
  }
  if (!state.user) {
    const user: AuthUser = {
      id: String(Date.now()),
      name: state.credentials.name || state.credentials.email.split('@')[0] || 'Usuario',
      email: state.credentials.email,
      createdAt: new Date().toISOString(),
    };
    await saveAuthState({ ...state, user });
    return user;
  }
  return state.user;
}

export async function setBiometricsEnabled(enabled: boolean) {
  const state = await loadAuthState();
  await saveAuthState({ ...state, biometricsEnabled: enabled });
}

export async function requestPasswordReset(email: string) {
  const state = await loadAuthState();
  const normalized = email.trim();
  const exists = state.credentials?.email === normalized;
  if (exists) {
    await saveAuthState({ ...state, resetRequestedAt: new Date().toISOString() });
  }
  return {
    ok: exists,
  };
}

export async function signOut() {
  const state = await loadAuthState();
  await saveAuthState({ ...state, user: null });
}
