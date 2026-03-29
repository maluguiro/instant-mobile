import { getCachedDuoState, loadDuoState } from '@/lib/duo';

export type DataScope =
  | { type: 'personal' }
  | { type: 'duo'; duoId: string };

export function getCachedDataScope(): DataScope {
  const duo = getCachedDuoState();
  if (duo.activeContext === 'duo' && duo.duoId) {
    return { type: 'duo', duoId: duo.duoId };
  }
  return { type: 'personal' };
}

export async function getActiveDataScope(): Promise<DataScope> {
  const duo = await loadDuoState();
  if (duo.activeContext === 'duo' && duo.duoId) {
    return { type: 'duo', duoId: duo.duoId };
  }
  return { type: 'personal' };
}

export function scopedKey(baseKey: string, scope: DataScope): string {
  if (scope.type === 'duo') {
    return `${baseKey}:duo:${scope.duoId}`;
  }
  return baseKey;
}

export function withDuoQuery(path: string, scope: DataScope): string {
  if (scope.type !== 'duo') return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}duoId=${encodeURIComponent(scope.duoId)}`;
}
