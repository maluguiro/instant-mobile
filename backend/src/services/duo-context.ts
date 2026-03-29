import { prisma } from './prisma';

export type DuoScope =
  | { type: 'personal' }
  | { type: 'duo'; duoId: string };

export type DuoScopeError = {
  status: number;
  message: string;
};

export async function resolveDuoScope(
  userId: string,
  rawDuoId: unknown
): Promise<DuoScope | DuoScopeError> {
  const duoId = typeof rawDuoId === 'string' ? rawDuoId.trim() : '';
  if (!duoId) {
    return { type: 'personal' };
  }

  const membership = await prisma.duoMember.findFirst({
    where: { duoId, userId, active: true },
    include: { duo: true },
  });
  if (!membership) {
    return { status: 403, message: 'Duo no encontrado o sin acceso.' };
  }
  if (membership.duo.closedAt) {
    return { status: 409, message: 'Duo cerrado.' };
  }
  return { type: 'duo', duoId };
}
