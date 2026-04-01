import { apiRequest } from '@/lib/api';
import { getCachedToken, loadToken } from '@/lib/session';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';

export type DuoState = {
  status: 'none' | 'member';
  activeContext: 'personal' | 'duo';
  duoId?: string;
  code?: string;
  memberCount?: number;
  closedAt?: string | null;
  closedByName?: string | null;
};

type DuoResponse = {
  duo: {
    id: string;
    code: string;
    memberCount: number;
    closedAt?: string | null;
    closedByName?: string | null;
  } | null;
};

const defaultDuoState: DuoState = {
  status: 'none',
  activeContext: 'personal',
  duoId: undefined,
  code: undefined,
  memberCount: 0,
  closedAt: null,
  closedByName: null,
};

const listeners = new Set<(state: DuoState) => void>();
let cachedState: DuoState = defaultDuoState;

function notify(next: DuoState) {
  listeners.forEach((listener) => listener(next));
}

function normalizeState(state: DuoState): DuoState {
  const normalized: DuoState = {
    status: state.status ?? 'none',
    activeContext: state.activeContext ?? 'personal',
    duoId: state.duoId,
    code: state.code,
    memberCount: state.memberCount ?? 0,
    closedAt: state.closedAt ?? null,
    closedByName: state.closedByName ?? null,
  };
  if (!normalized.duoId) {
    normalized.status = 'none';
    normalized.activeContext = 'personal';
    normalized.code = undefined;
    normalized.memberCount = 0;
    normalized.closedAt = null;
    normalized.closedByName = null;
  }
  if (normalized.closedAt) {
    normalized.activeContext = 'personal';
  }
  return normalized;
}

export function getCachedDuoState() {
  return cachedState;
}

export function subscribeDuo(listener: (state: DuoState) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function loadDuoState(): Promise<DuoState> {
  const stored = await getItem<DuoState>(STORAGE_KEYS.duoState, defaultDuoState);
  cachedState = normalizeState(stored);
  return cachedState;
}

async function saveDuoState(state: DuoState) {
  const normalized = normalizeState(state);
  cachedState = normalized;
  await setItem(STORAGE_KEYS.duoState, normalized);
  notify(normalized);
}

async function getAuthToken() {
  const cached = getCachedToken();
  if (cached) return cached;
  const loaded = await loadToken();
  return loaded;
}

export async function refreshDuo(): Promise<DuoState> {
  const token = await getAuthToken();
  if (!token) {
    await saveDuoState({ ...defaultDuoState, activeContext: 'personal' });
    return cachedState;
  }

  try {
    const response = await apiRequest<DuoResponse>('/duo', { method: 'GET', token });
    if (!response.duo) {
      await saveDuoState({ ...defaultDuoState, activeContext: 'personal' });
      return cachedState;
    }
    await saveDuoState({
      status: 'member',
      activeContext: cachedState.activeContext === 'duo' ? 'duo' : 'personal',
      duoId: response.duo.id,
      code: response.duo.code,
      memberCount: response.duo.memberCount,
      closedAt: response.duo.closedAt ?? null,
      closedByName: response.duo.closedByName ?? null,
    });
    return cachedState;
  } catch {
    return cachedState;
  }
}

export async function createDuo(): Promise<DuoState> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Necesitás iniciar sesión para crear Duo.');
  }
  const response = await apiRequest<{ duo: DuoResponse['duo'] }>('/duo/create', {
    method: 'POST',
    token,
  });
  if (!response.duo) {
    throw new Error('No pudimos crear Duo.');
  }
  await saveDuoState({
    status: 'member',
    activeContext: 'duo',
    duoId: response.duo.id,
    code: response.duo.code,
    memberCount: response.duo.memberCount,
    closedAt: response.duo.closedAt ?? null,
    closedByName: response.duo.closedByName ?? null,
  });
  return cachedState;
}

export async function joinDuo(code: string): Promise<DuoState> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Necesitás iniciar sesión para unirte a Duo.');
  }
  const response = await apiRequest<{ duo: DuoResponse['duo'] }>('/duo/join', {
    method: 'POST',
    token,
    body: { code },
  });
  if (!response.duo) {
    throw new Error('No pudimos unirnos a Duo.');
  }
  await saveDuoState({
    status: 'member',
    activeContext: 'duo',
    duoId: response.duo.id,
    code: response.duo.code,
    memberCount: response.duo.memberCount,
    closedAt: response.duo.closedAt ?? null,
    closedByName: response.duo.closedByName ?? null,
  });
  return cachedState;
}

export async function leaveDuo(): Promise<void> {
  const token = await getAuthToken();
  if (token) {
    try {
      await apiRequest('/duo/leave', { method: 'POST', token });
    } catch {
      // ignore
    }
  }
  await saveDuoState({ ...defaultDuoState, activeContext: 'personal' });
}

export async function setActiveDuoContext(next: 'personal' | 'duo'): Promise<DuoState> {
  const state = await loadDuoState();
  if (next === 'duo' && !state.duoId) {
    await saveDuoState({ ...state, activeContext: 'personal' });
    return cachedState;
  }
  await saveDuoState({ ...state, activeContext: next });
  return cachedState;
}

export async function resetDuoState() {
  await saveDuoState({ ...defaultDuoState, activeContext: 'personal' });
}
