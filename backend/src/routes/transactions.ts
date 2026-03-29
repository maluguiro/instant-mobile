import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../services/prisma';
import { resolveDuoScope } from '../services/duo-context';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  currency: z.string().min(1),
  category: z.string().min(1),
  date: z.string().min(1),
  method: z.string().min(1),
  note: z.string().optional(),
  weekly: z.boolean().optional(),
});

export const transactionsRouter = Router();

function getTransactionModel() {
  const model =
    (prisma as unknown as { transaction?: typeof prisma.transaction; transactions?: typeof prisma.transaction })
      .transaction ?? (prisma as unknown as { transactions?: typeof prisma.transaction }).transactions;
  if (!model) {
    throw new Error('Prisma Client no tiene el modelo Transaction. EjecutÃ¡ `prisma generate`.');
  }
  return model;
}

transactionsRouter.get('/', async (req, res) => {
  const transactionModel = getTransactionModel();
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const items = await transactionModel.findMany({
    where: scope.type === 'duo' ? { duoId: scope.duoId } : { userId: req.userId, duoId: null },
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
      note: item.note ?? undefined,
      weekly: item.weekly,
      createdAt: item.createdAt.toISOString(),
    }))
  );
});

transactionsRouter.post('/', async (req, res) => {
  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invÃ¡lidos', details: parsed.error.flatten() });
  }
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const { type, amount, currency, category, date, method, note, weekly } = parsed.data;
  const transactionModel = getTransactionModel();
  let created;
  try {
    created = await transactionModel.create({
      data: {
        userId: req.userId,
        duoId: scope.type === 'duo' ? scope.duoId : null,
        type,
        amount,
        currency,
        category,
        date: new Date(date + 'T00:00:00'),
        method,
        note: note?.trim() ? note.trim() : null,
        weekly: weekly ?? false,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientValidationError && error.message.includes('Unknown argument `note`')) {
      created = await transactionModel.create({
        data: {
          userId: req.userId,
          duoId: scope.type === 'duo' ? scope.duoId : null,
          type,
          amount,
          currency,
          category,
          date: new Date(date + 'T00:00:00'),
          method,
          weekly: weekly ?? false,
        },
      });
    } else {
      throw error;
    }
  }
  return res.status(201).json({
    id: created.id,
    type: created.type,
    amount: created.amount,
    currency: created.currency,
    category: created.category,
    date: created.date.toISOString().slice(0, 10),
    method: created.method,
    note: created.note ?? undefined,
    weekly: created.weekly,
    createdAt: created.createdAt.toISOString(),
  });
});

transactionsRouter.put('/:id', async (req, res) => {
  const parsed = transactionSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invÃ¡lidos', details: parsed.error.flatten() });
  }
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const { id } = req.params;
  const transactionModel = getTransactionModel();
  const existing = await transactionModel.findFirst({
    where: scope.type === 'duo' ? { id, duoId: scope.duoId } : { id, userId: req.userId, duoId: null },
  });
  if (!existing) {
    return res.status(404).json({ error: 'Movimiento no encontrado.' });
  }
  const data = parsed.data;
  const updateData = {
    type: data.type ?? existing.type,
    amount: data.amount ?? existing.amount,
    currency: data.currency ?? existing.currency,
    category: data.category ?? existing.category,
    method: data.method ?? existing.method,
    date: data.date ? new Date(data.date + 'T00:00:00') : existing.date,
    note: typeof data.note === 'string' ? (data.note.trim() ? data.note.trim() : null) : existing.note,
    weekly: typeof data.weekly === 'boolean' ? data.weekly : existing.weekly,
  };
  let updated;
  try {
    updated = await transactionModel.update({
      where: { id },
      data: updateData,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientValidationError && error.message.includes('Unknown argument `note`')) {
      const { note: _omit, ...fallback } = updateData;
      updated = await transactionModel.update({
        where: { id },
        data: fallback,
      });
    } else {
      throw error;
    }
  }
  return res.json({
    id: updated.id,
    type: updated.type,
    amount: updated.amount,
    currency: updated.currency,
    category: updated.category,
    date: updated.date.toISOString().slice(0, 10),
    method: updated.method,
    note: updated.note ?? undefined,
    weekly: updated.weekly,
    createdAt: updated.createdAt.toISOString(),
  });
});

transactionsRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;
  // eslint-disable-next-line no-console
  console.log('[transactions][delete]', { id, userId: req.userId });
  const transactionModel = getTransactionModel();
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const existing = await transactionModel.findFirst({
    where: scope.type === 'duo' ? { id, duoId: scope.duoId } : { id, userId: req.userId, duoId: null },
  });
  if (!existing) {
    // eslint-disable-next-line no-console
    console.log('[transactions][delete][not-found]', { id, userId: req.userId });
    return res.status(404).json({ error: 'Movimiento no encontrado.' });
  }
  await transactionModel.delete({ where: { id } });
  // eslint-disable-next-line no-console
  console.log('[transactions][delete][ok]', { id, userId: req.userId });
  return res.status(204).send();
});
