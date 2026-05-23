import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../services/prisma';
import { resolveDuoScope } from '../services/duo-context';

const categorySchema = z.object({
  name: z.string().min(1),
});

export const categoriesRouter = Router();

categoriesRouter.get('/', async (req, res) => {
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const items = await prisma.category.findMany({
    where: scope.type === 'duo' ? { duoId: scope.duoId } : { userId: req.userId, duoId: null },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(items.map((item) => ({ id: item.id, name: item.name, createdAt: item.createdAt })));
});

categoriesRouter.post('/', async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invÃ¡lidos', details: parsed.error.flatten() });
  }
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const name = parsed.data.name.trim();
  const exists = await prisma.category.findFirst({
    where:
      scope.type === 'duo'
        ? { duoId: scope.duoId, name: { equals: name, mode: 'insensitive' } }
        : { userId: req.userId, duoId: null, name: { equals: name, mode: 'insensitive' } },
  });
  if (exists) {
    return res.status(409).json({ error: 'La categorÃ­a ya existe.' });
  }
  const created = await prisma.category.create({
    data: { userId: req.userId, duoId: scope.type === 'duo' ? scope.duoId : null, name },
  });
  return res.status(201).json({ id: created.id, name: created.name, createdAt: created.createdAt });
});

categoriesRouter.put('/:name', async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invÃ¡lidos', details: parsed.error.flatten() });
  }
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const previous = req.params.name;
  const nextName = parsed.data.name.trim();
  const existing = await prisma.category.findFirst({
    where:
      scope.type === 'duo'
        ? { duoId: scope.duoId, name: { equals: previous, mode: 'insensitive' } }
        : { userId: req.userId, duoId: null, name: { equals: previous, mode: 'insensitive' } },
  });
  if (!existing) {
    return res.status(404).json({ error: 'CategorÃ­a no encontrada.' });
  }
  const dup = await prisma.category.findFirst({
    where:
      scope.type === 'duo'
        ? { duoId: scope.duoId, name: { equals: nextName, mode: 'insensitive' }, NOT: { id: existing.id } }
        : {
            userId: req.userId,
            duoId: null,
            name: { equals: nextName, mode: 'insensitive' },
            NOT: { id: existing.id },
          },
  });
  if (dup) {
    return res.status(409).json({ error: 'La categorÃ­a ya existe.' });
  }
  const updated = await prisma.category.update({
    where: { id: existing.id },
    data: { name: nextName },
  });
  await prisma.transaction.updateMany({
    where:
      scope.type === 'duo'
        ? { duoId: scope.duoId, category: previous }
        : { userId: req.userId, duoId: null, category: previous },
    data: { category: nextName },
  });
  return res.json({ id: updated.id, name: updated.name, createdAt: updated.createdAt });
});

categoriesRouter.delete('/:name', async (req, res) => {
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const name = req.params.name;
  const existing = await prisma.category.findFirst({
    where:
      scope.type === 'duo'
        ? { duoId: scope.duoId, name: { equals: name, mode: 'insensitive' } }
        : { userId: req.userId, duoId: null, name: { equals: name, mode: 'insensitive' } },
  });
  if (!existing) {
    return res.status(404).json({ error: 'CategorÃ­a no encontrada.' });
  }
  const used = await prisma.transaction.findFirst({
    where:
      scope.type === 'duo'
        ? { duoId: scope.duoId, category: name }
        : { userId: req.userId, duoId: null, category: name },
  });
  if (used) {
    return res.status(409).json({ error: 'CategorÃ­a en uso.' });
  }
  await prisma.category.delete({ where: { id: existing.id } });
  return res.status(204).send();
});

categoriesRouter.delete('/clear', async (req, res) => {
  try {
    const memberships = await prisma.duoMember.findMany({
      where: { userId: req.userId },
      select: { duoId: true },
    });
    const duoIds = memberships.map((membership) => membership.duoId);
    const result = await prisma.category.deleteMany({
      where:
        duoIds.length > 0
          ? {
              OR: [{ userId: req.userId }, { duoId: { in: duoIds } }],
            }
          : { userId: req.userId },
    });
    // eslint-disable-next-line no-console
    console.log('[categories][clear]', { userId: req.userId, deleted: result.count });
    return res.json({ ok: true, deleted: result.count });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[categories][clear][error]', { userId: req.userId, error });
    return res.status(500).json({ error: 'No se pudieron borrar las categorÃ­as.' });
  }
});
