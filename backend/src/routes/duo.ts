import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../services/prisma';

export const duoRouter = Router();

const joinSchema = z.object({
  code: z.string().min(3),
});

async function findMembership(userId: string) {
  return prisma.duoMember.findFirst({
    where: { userId, active: true },
    include: { duo: true },
  });
}

async function findOpenMembership(userId: string) {
  const membership = await findMembership(userId);
  if (!membership) return null;
  if (membership.duo.closedAt) return null;
  return membership;
}

async function generateCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const exists = await prisma.duo.findUnique({ where: { code } });
    if (!exists) return code;
  }
  throw new Error('No se pudo generar un codigo unico.');
}

duoRouter.get('/', async (req, res) => {
  const membership = await findMembership(req.userId);
  if (!membership) {
    return res.json({ duo: null });
  }
  const memberCount = await prisma.duoMember.count({
    where: { duoId: membership.duoId, active: true },
  });
  if (membership.duo.closedAt) {
    await prisma.duoMember.update({
      where: { id: membership.id },
      data: { active: false },
    });
  }
  let closedByName: string | null = null;
  if (membership.duo.closedById) {
    const closedBy = await prisma.user.findUnique({
      where: { id: membership.duo.closedById },
      select: { name: true },
    });
    closedByName = closedBy?.name ?? null;
  }
  return res.json({
    duo: {
      id: membership.duo.id,
      code: membership.duo.code,
      memberCount,
      closedAt: membership.duo.closedAt,
      closedByName,
    },
  });
});

duoRouter.post('/create', async (req, res) => {
  const existing = await findOpenMembership(req.userId);
  if (existing) {
    return res.status(409).json({ error: 'Ya tenes un Duo activo.' });
  }
  const code = await generateCode();
  const duo = await prisma.duo.create({
    data: {
      code,
      members: {
        create: {
          userId: req.userId,
          active: true,
        },
      },
    },
  });
  return res.status(201).json({
    duo: {
      id: duo.id,
      code: duo.code,
      memberCount: 1,
      closedAt: duo.closedAt,
    },
  });
});

duoRouter.post('/join', async (req, res) => {
  const parsed = joinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Codigo invalido.' });
  }
  const existing = await findOpenMembership(req.userId);
  if (existing) {
    return res.status(409).json({ error: 'Ya tenes un Duo activo.' });
  }
  const code = parsed.data.code.trim().toUpperCase();
  const duo = await prisma.duo.findUnique({ where: { code } });
  if (!duo || duo.closedAt) {
    return res.status(404).json({ error: 'Duo no encontrado.' });
  }
  const memberCount = await prisma.duoMember.count({ where: { duoId: duo.id, active: true } });
  if (memberCount >= 2) {
    return res.status(409).json({ error: 'Este Duo ya tiene dos personas.' });
  }
  await prisma.duoMember.create({
    data: {
      duoId: duo.id,
      userId: req.userId,
      active: true,
    },
  });
  return res.status(201).json({
    duo: {
      id: duo.id,
      code: duo.code,
      memberCount: memberCount + 1,
      closedAt: duo.closedAt,
    },
  });
});

duoRouter.post('/leave', async (req, res) => {
  const membership = await findMembership(req.userId);
  if (!membership) {
    return res.json({ ok: true });
  }
  if (membership.duo.closedAt) {
    await prisma.duoMember.update({
      where: { id: membership.id },
      data: { active: false },
    });
    return res.json({ ok: true });
  }
  await prisma.duoMember.update({
    where: { id: membership.id },
    data: { active: false },
  });
  await prisma.duo.update({
    where: { id: membership.duoId },
    data: { closedAt: new Date(), closedById: req.userId },
  });
  return res.json({ ok: true });
});

duoRouter.post('/reset', async (req, res) => {
  try {
    const memberships = await prisma.duoMember.findMany({
      where: { userId: req.userId },
      include: { duo: true },
    });

    for (const membership of memberships) {
      if (!membership.duo.closedAt) {
        await prisma.duo.update({
          where: { id: membership.duoId },
          data: { closedAt: new Date(), closedById: req.userId },
        });
      }
      await prisma.duoMember.update({
        where: { id: membership.id },
        data: { active: false },
      });
    }

    const deletedDuoIds = memberships.map((m) => m.duoId);

    if (deletedDuoIds.length > 0) {
      await prisma.category.deleteMany({ where: { duoId: { in: deletedDuoIds } } });
      await prisma.paymentMethod.deleteMany({ where: { duoId: { in: deletedDuoIds } } });
      await prisma.transaction.deleteMany({ where: { duoId: { in: deletedDuoIds } } });
    }

    // eslint-disable-next-line no-console
    console.log('[duo][reset]', { userId: req.userId, deletedDuos: deletedDuoIds.length });
    return res.json({ ok: true, clearedDuos: deletedDuoIds.length });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[duo][reset][error]', { userId: req.userId, error });
    return res.status(500).json({ error: 'No se pudo reiniciar Duo.' });
  }
});
