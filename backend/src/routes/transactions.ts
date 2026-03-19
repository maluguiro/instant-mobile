import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../services/prisma';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  currency: z.string().min(1),
  category: z.string().min(1),
  date: z.string().min(1),
  method: z.string().min(1),
});

export const transactionsRouter = Router();

function getTransactionModel() {
  const model = (prisma as unknown as { transaction?: typeof prisma.transaction; transactions?: typeof prisma.transaction }).transaction
    ?? (prisma as unknown as { transactions?: typeof prisma.transaction }).transactions;
  if (!model) {
    throw new Error('Prisma Client no tiene el modelo Transaction. Ejecutá `prisma generate`.');
  }
  return model;
}

transactionsRouter.get('/', async (req, res) => {
  const transactionModel = getTransactionModel();
  const items = await transactionModel.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(
    items.map((item) => ({
      id: item.id,
      type: item.type,
      amount: item.amount,
      currency: item.currency,
      category: item.category,
      date: item.date.toISOString().slice(0, 10),
      method: item.method,
      createdAt: item.createdAt.toISOString(),
    }))
  );
});

transactionsRouter.post('/', async (req, res) => {
  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
  }
  const { type, amount, currency, category, date, method } = parsed.data;
  const transactionModel = getTransactionModel();
  const created = await transactionModel.create({
    data: {
      userId: req.userId,
      type,
      amount,
      currency,
      category,
      date: new Date(date + 'T00:00:00'),
      method,
    },
  });
  return res.status(201).json({
    id: created.id,
    type: created.type,
    amount: created.amount,
    currency: created.currency,
    category: created.category,
    date: created.date.toISOString().slice(0, 10),
    method: created.method,
    createdAt: created.createdAt.toISOString(),
  });
});

transactionsRouter.put('/:id', async (req, res) => {
  const parsed = transactionSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
  }
  const { id } = req.params;
  const transactionModel = getTransactionModel();
  const existing = await transactionModel.findFirst({
    where: { id, userId: req.userId },
  });
  if (!existing) {
    return res.status(404).json({ error: 'Movimiento no encontrado.' });
  }
  const data = parsed.data;
  const updated = await transactionModel.update({
    where: { id },
    data: {
      type: data.type ?? existing.type,
      amount: data.amount ?? existing.amount,
      currency: data.currency ?? existing.currency,
      category: data.category ?? existing.category,
      method: data.method ?? existing.method,
      date: data.date ? new Date(data.date + 'T00:00:00') : existing.date,
    },
  });
  return res.json({
    id: updated.id,
    type: updated.type,
    amount: updated.amount,
    currency: updated.currency,
    category: updated.category,
    date: updated.date.toISOString().slice(0, 10),
    method: updated.method,
    createdAt: updated.createdAt.toISOString(),
  });
});

transactionsRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const transactionModel = getTransactionModel();
  const existing = await transactionModel.findFirst({
    where: { id, userId: req.userId },
  });
  if (!existing) {
    return res.status(404).json({ error: 'Movimiento no encontrado.' });
  }
  await transactionModel.delete({ where: { id } });
  return res.status(204).send();
});
