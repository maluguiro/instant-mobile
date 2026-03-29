import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../services/prisma';

const categorySchema = z.object({
  name: z.string().min(1),
});

export const categoriesRouter = Router();

categoriesRouter.get('/', async (req, res) => {
  const items = await prisma.category.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(items.map((item) => ({ id: item.id, name: item.name, createdAt: item.createdAt })));
});

categoriesRouter.post('/', async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
  }
  const name = parsed.data.name.trim();
  const exists = await prisma.category.findFirst({
    where: { userId: req.userId, name: { equals: name, mode: 'insensitive' } },
  });
  if (exists) {
    return res.status(409).json({ error: 'La categoría ya existe.' });
  }
  const created = await prisma.category.create({
    data: { userId: req.userId, name },
  });
  return res.status(201).json({ id: created.id, name: created.name, createdAt: created.createdAt });
});

categoriesRouter.put('/:name', async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
  }
  const previous = req.params.name;
  const nextName = parsed.data.name.trim();
  const existing = await prisma.category.findFirst({
    where: { userId: req.userId, name: { equals: previous, mode: 'insensitive' } },
  });
  if (!existing) {
    return res.status(404).json({ error: 'Categoría no encontrada.' });
  }
  const dup = await prisma.category.findFirst({
    where: {
      userId: req.userId,
      name: { equals: nextName, mode: 'insensitive' },
      NOT: { id: existing.id },
    },
  });
  if (dup) {
    return res.status(409).json({ error: 'La categoría ya existe.' });
  }
  const updated = await prisma.category.update({
    where: { id: existing.id },
    data: { name: nextName },
  });
  await prisma.transaction.updateMany({
    where: { userId: req.userId, category: previous },
    data: { category: nextName },
  });
  return res.json({ id: updated.id, name: updated.name, createdAt: updated.createdAt });
});

categoriesRouter.delete('/:name', async (req, res) => {
  const name = req.params.name;
  const existing = await prisma.category.findFirst({
    where: { userId: req.userId, name: { equals: name, mode: 'insensitive' } },
  });
  if (!existing) {
    return res.status(404).json({ error: 'Categoría no encontrada.' });
  }
  const used = await prisma.transaction.findFirst({
    where: { userId: req.userId, category: name },
  });
  if (used) {
    return res.status(409).json({ error: 'Categoría en uso.' });
  }
  await prisma.category.delete({ where: { id: existing.id } });
  return res.status(204).send();
});
