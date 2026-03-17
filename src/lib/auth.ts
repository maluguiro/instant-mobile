import AsyncStorage from '@react-native-async-storage/async-storage';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

type AuthState = {
  user: AuthUser | null;
};

const STORAGE_KEY = 'instant:auth';

const listeners = new Set<(state: AuthState) => void>();
let cachedState: AuthState = { user: null };

export async function loadAuthState(): Promise<AuthState> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) {
    cachedState = { user: null };
    return cachedState;
  }
  try {
    const parsed = JSON.parse(stored) as AuthState;
    cachedState = parsed;
    return parsed;
  } catch {
    cachedState = { user: null };
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
  cachedState = state;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  notify(state);
}

export async function signIn(email: string, name?: string) {
  const user: AuthUser = {
    id: String(Date.now()),
    name: name?.trim() || email.split('@')[0] || 'Usuario',
    email: email.trim(),
    createdAt: new Date().toISOString(),
  };
  await saveAuthState({ user });
  return user;
}

export async function signUp(name: string, email: string) {
  const user: AuthUser = {
    id: String(Date.now()),
    name: name.trim(),
    email: email.trim(),
    createdAt: new Date().toISOString(),
  };
  await saveAuthState({ user });
  return user;
}

export async function signOut() {
  await saveAuthState({ user: null });
}
