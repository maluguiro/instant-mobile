import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../services/prisma';
import { resolveDuoScope } from '../services/duo-context';

const methodSchema = z.object({
  name: z.string().min(1),
});

export const paymentMethodsRouter = Router();

paymentMethodsRouter.get('/', async (req, res) => {
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const items = await prisma.paymentMethod.findMany({
    where: scope.type === 'duo' ? { duoId: scope.duoId } : { userId: req.userId, duoId: null },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(items.map((item) => ({ id: item.id, name: item.name, createdAt: item.createdAt })));
});

paymentMethodsRouter.post('/', async (req, res) => {
  const parsed = methodSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invÃ¡lidos', details: parsed.error.flatten() });
  }
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const name = parsed.data.name.trim();
  const exists = await prisma.paymentMethod.findFirst({
    where:
      scope.type === 'duo'
        ? { duoId: scope.duoId, name: { equals: name, mode: 'insensitive' } }
        : { userId: req.userId, duoId: null, name: { equals: name, mode: 'insensitive' } },
  });
  if (exists) {
    return res.status(409).json({ error: 'El mÃ©todo ya existe.' });
  }
  const created = await prisma.paymentMethod.create({
    data: { userId: req.userId, duoId: scope.type === 'duo' ? scope.duoId : null, name },
  });
  return res.status(201).json({ id: created.id, name: created.name, createdAt: created.createdAt });
});

paymentMethodsRouter.put('/:name', async (req, res) => {
  const parsed = methodSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invÃ¡lidos', details: parsed.error.flatten() });
  }
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const previous = req.params.name;
  const nextName = parsed.data.name.trim();
  const existing = await prisma.paymentMethod.findFirst({
    where:
      scope.type === 'duo'
        ? { duoId: scope.duoId, name: { equals: previous, mode: 'insensitive' } }
        : { userId: req.userId, duoId: null, name: { equals: previous, mode: 'insensitive' } },
  });
  if (!existing) {
    return res.status(404).json({ error: 'MÃ©todo no encontrado.' });
  }
  const dup = await prisma.paymentMethod.findFirst({
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
    return res.status(409).json({ error: 'El mÃ©todo ya existe.' });
  }
  const updated = await prisma.paymentMethod.update({
    where: { id: existing.id },
    data: { name: nextName },
  });
  await prisma.transaction.updateMany({
    where:
      scope.type === 'duo'
        ? { duoId: scope.duoId, method: previous }
        : { userId: req.userId, duoId: null, method: previous },
    data: { method: nextName },
  });
  return res.json({ id: updated.id, name: updated.name, createdAt: updated.createdAt });
});

paymentMethodsRouter.delete('/:name', async (req, res) => {
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const name = req.params.name;
  const existing = await prisma.paymentMethod.findFirst({
    where:
      scope.type === 'duo'
        ? { duoId: scope.duoId, name: { equals: name, mode: 'insensitive' } }
        : { userId: req.userId, duoId: null, name: { equals: name, mode: 'insensitive' } },
  });
  if (!existing) {
    return res.status(404).json({ error: 'MÃ©todo no encontrado.' });
  }
  const used = await prisma.transaction.findFirst({
    where:
      scope.type === 'duo'
        ? { duoId: scope.duoId, method: name }
        : { userId: req.userId, duoId: null, method: name },
  });
  if (used) {
    return res.status(409).json({ error: 'MÃ©todo en uso.' });
  }
  await prisma.paymentMethod.delete({ where: { id: existing.id } });
  return res.status(204).send();
});
