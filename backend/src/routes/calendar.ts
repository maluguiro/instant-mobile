import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../services/prisma';
import { resolveDuoScope } from '../services/duo-context';

export const calendarRouter = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ModelDelegate = any;

function getDueDateModel(): ModelDelegate {
  const p = prisma as unknown as Record<string, unknown>;
  return p.dueDate ?? p.dueDates;
}

function getRecurringPaymentModel(): ModelDelegate {
  const p = prisma as unknown as Record<string, unknown>;
  return p.recurringPayment ?? p.recurringPayments;
}

function getInstallmentModel(): ModelDelegate {
  const p = prisma as unknown as Record<string, unknown>;
  return p.installment ?? p.installments;
}

const dueDateSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(1),
  date: z.string().min(1),
  category: z.string().optional(),
  method: z.string().optional(),
  note: z.string().optional(),
  important: z.boolean().optional(),
  calendarExported: z.boolean().optional(),
  status: z.string().optional(),
});

const recurringSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(1),
  frequency: z.string().min(1),
  everyDays: z.number().int().optional(),
  nextDate: z.string().min(1),
  durationType: z.string().optional(),
  durationMonths: z.number().int().optional(),
  endDate: z.string().optional(),
  category: z.string().optional(),
  method: z.string().optional(),
  important: z.boolean().optional(),
  calendarExported: z.boolean().optional(),
  status: z.string().optional(),
});

const installmentSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(1),
  total: z.number().int().positive(),
  current: z.number().int().min(0),
  nextDate: z.string().min(1),
  category: z.string().optional(),
  method: z.string().optional(),
  important: z.boolean().optional(),
  calendarExported: z.boolean().optional(),
  status: z.string().optional(),
});

calendarRouter.get('/due-dates', async (req, res) => {
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const items = await getDueDateModel().findMany({
    where: scope.type === 'duo' ? { duoId: scope.duoId } : { userId: req.userId, duoId: null },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items.map((item: any) => ({
      id: item.id,
      name: item.name,
      amount: item.amount,
      currency: item.currency,
      date: item.date.toISOString().slice(0, 10),
      category: item.category ?? undefined,
      method: item.method ?? undefined,
      note: item.note ?? undefined,
      important: item.important,
      calendarExported: item.calendarExported,
      status: item.status ?? undefined,
      createdAt: item.createdAt.toISOString(),
    }))
  );
});

calendarRouter.post('/due-dates', async (req, res) => {
  const parsed = dueDateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
  }
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const data = parsed.data;
  const created = await getDueDateModel().create({
    data: {
      userId: req.userId,
      duoId: scope.type === 'duo' ? scope.duoId : null,
      name: data.name,
      amount: data.amount,
      currency: data.currency,
      date: new Date(data.date + 'T00:00:00'),
      category: data.category?.trim() ? data.category.trim() : null,
      method: data.method?.trim() ? data.method.trim() : null,
      note: data.note?.trim() ? data.note.trim() : null,
      important: data.important ?? false,
      calendarExported: data.calendarExported ?? false,
      status: data.status ?? 'pending',
    },
  });
  return res.status(201).json({
    id: created.id,
    name: created.name,
    amount: created.amount,
    currency: created.currency,
    date: created.date.toISOString().slice(0, 10),
    category: created.category ?? undefined,
    method: created.method ?? undefined,
    note: created.note ?? undefined,
    important: created.important,
    calendarExported: created.calendarExported,
    status: created.status ?? undefined,
    createdAt: created.createdAt.toISOString(),
  });
});

calendarRouter.put('/due-dates/:id', async (req, res) => {
  const parsed = dueDateSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
  }
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const { id } = req.params;
  const existing = await getDueDateModel().findFirst({
    where: scope.type === 'duo' ? { id, duoId: scope.duoId } : { id, userId: req.userId, duoId: null },
  });
  if (!existing) {
    return res.status(404).json({ error: 'Vencimiento no encontrado.' });
  }
  const data = parsed.data;
  const updated = await getDueDateModel().update({
    where: { id },
    data: {
      name: data.name ?? existing.name,
      amount: data.amount ?? existing.amount,
      currency: data.currency ?? existing.currency,
      date: data.date ? new Date(data.date + 'T00:00:00') : existing.date,
      category: typeof data.category === 'string' ? data.category.trim() || null : existing.category,
      method: typeof data.method === 'string' ? data.method.trim() || null : existing.method,
      note: typeof data.note === 'string' ? data.note.trim() || null : existing.note,
      important: typeof data.important === 'boolean' ? data.important : existing.important,
      calendarExported:
        typeof data.calendarExported === 'boolean' ? data.calendarExported : existing.calendarExported,
      status: data.status ?? existing.status,
    },
  });
  return res.json({
    id: updated.id,
    name: updated.name,
    amount: updated.amount,
    currency: updated.currency,
    date: updated.date.toISOString().slice(0, 10),
    category: updated.category ?? undefined,
    method: updated.method ?? undefined,
    note: updated.note ?? undefined,
    important: updated.important,
    calendarExported: updated.calendarExported,
    status: updated.status ?? undefined,
    createdAt: updated.createdAt.toISOString(),
  });
});

calendarRouter.delete('/due-dates/:id', async (req, res) => {
  const { id } = req.params;
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const existing = await getDueDateModel().findFirst({
    where: scope.type === 'duo' ? { id, duoId: scope.duoId } : { id, userId: req.userId, duoId: null },
  });
  if (!existing) {
    return res.status(404).json({ error: 'Vencimiento no encontrado.' });
  }
  await getDueDateModel().delete({ where: { id } });
  return res.status(204).send();
});

calendarRouter.get('/recurring', async (req, res) => {
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const items = await getRecurringPaymentModel().findMany({
    where: scope.type === 'duo' ? { duoId: scope.duoId } : { userId: req.userId, duoId: null },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items.map((item: any) => ({
      id: item.id,
      name: item.name,
      amount: item.amount,
      currency: item.currency,
      frequency: item.frequency,
      everyDays: item.everyDays ?? undefined,
      nextDate: item.nextDate.toISOString().slice(0, 10),
      durationType: item.durationType ?? undefined,
      durationMonths: item.durationMonths ?? undefined,
      endDate: item.endDate ? item.endDate.toISOString().slice(0, 10) : undefined,
      category: item.category ?? undefined,
      method: item.method ?? undefined,
      important: item.important,
      calendarExported: item.calendarExported,
      status: item.status ?? undefined,
      createdAt: item.createdAt.toISOString(),
    }))
  );
});

calendarRouter.post('/recurring', async (req, res) => {
  const parsed = recurringSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
  }
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const data = parsed.data;
  const created = await getRecurringPaymentModel().create({
    data: {
      userId: req.userId,
      duoId: scope.type === 'duo' ? scope.duoId : null,
      name: data.name,
      amount: data.amount,
      currency: data.currency,
      frequency: data.frequency,
      everyDays: data.everyDays ?? null,
      nextDate: new Date(data.nextDate + 'T00:00:00'),
      durationType: data.durationType ?? 'indefinite',
      durationMonths: data.durationMonths ?? null,
      endDate: data.endDate ? new Date(data.endDate + 'T00:00:00') : null,
      category: data.category?.trim() ? data.category.trim() : null,
      method: data.method?.trim() ? data.method.trim() : null,
      important: data.important ?? false,
      calendarExported: data.calendarExported ?? false,
      status: data.status ?? 'active',
    },
  });
  return res.status(201).json({
    id: created.id,
    name: created.name,
    amount: created.amount,
    currency: created.currency,
    frequency: created.frequency,
    everyDays: created.everyDays ?? undefined,
    nextDate: created.nextDate.toISOString().slice(0, 10),
    durationType: created.durationType ?? undefined,
    durationMonths: created.durationMonths ?? undefined,
    endDate: created.endDate ? created.endDate.toISOString().slice(0, 10) : undefined,
    category: created.category ?? undefined,
    method: created.method ?? undefined,
    important: created.important,
    calendarExported: created.calendarExported,
    status: created.status ?? undefined,
    createdAt: created.createdAt.toISOString(),
  });
});

calendarRouter.put('/recurring/:id', async (req, res) => {
  const parsed = recurringSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
  }
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const { id } = req.params;
  const existing = await getRecurringPaymentModel().findFirst({
    where: scope.type === 'duo' ? { id, duoId: scope.duoId } : { id, userId: req.userId, duoId: null },
  });
  if (!existing) {
    return res.status(404).json({ error: 'Recurrente no encontrado.' });
  }
  const data = parsed.data;
  const updated = await getRecurringPaymentModel().update({
    where: { id },
    data: {
      name: data.name ?? existing.name,
      amount: data.amount ?? existing.amount,
      currency: data.currency ?? existing.currency,
      frequency: data.frequency ?? existing.frequency,
      everyDays: typeof data.everyDays === 'number' ? data.everyDays : existing.everyDays,
      nextDate: data.nextDate ? new Date(data.nextDate + 'T00:00:00') : existing.nextDate,
      durationType: data.durationType ?? existing.durationType,
      durationMonths: typeof data.durationMonths === 'number' ? data.durationMonths : existing.durationMonths,
      endDate: data.endDate ? new Date(data.endDate + 'T00:00:00') : existing.endDate,
      category: typeof data.category === 'string' ? data.category.trim() || null : existing.category,
      method: typeof data.method === 'string' ? data.method.trim() || null : existing.method,
      important: typeof data.important === 'boolean' ? data.important : existing.important,
      calendarExported:
        typeof data.calendarExported === 'boolean' ? data.calendarExported : existing.calendarExported,
      status: data.status ?? existing.status,
    },
  });
  return res.json({
    id: updated.id,
    name: updated.name,
    amount: updated.amount,
    currency: updated.currency,
    frequency: updated.frequency,
    everyDays: updated.everyDays ?? undefined,
    nextDate: updated.nextDate.toISOString().slice(0, 10),
    durationType: updated.durationType ?? undefined,
    durationMonths: updated.durationMonths ?? undefined,
    endDate: updated.endDate ? updated.endDate.toISOString().slice(0, 10) : undefined,
    category: updated.category ?? undefined,
    method: updated.method ?? undefined,
    important: updated.important,
    calendarExported: updated.calendarExported,
    status: updated.status ?? undefined,
    createdAt: updated.createdAt.toISOString(),
  });
});

calendarRouter.delete('/recurring/:id', async (req, res) => {
  const { id } = req.params;
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const existing = await getRecurringPaymentModel().findFirst({
    where: scope.type === 'duo' ? { id, duoId: scope.duoId } : { id, userId: req.userId, duoId: null },
  });
  if (!existing) {
    return res.status(404).json({ error: 'Recurrente no encontrado.' });
  }
  await getRecurringPaymentModel().delete({ where: { id } });
  return res.status(204).send();
});

calendarRouter.get('/installments', async (req, res) => {
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const items = await getInstallmentModel().findMany({
    where: scope.type === 'duo' ? { duoId: scope.duoId } : { userId: req.userId, duoId: null },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items.map((item: any) => ({
      id: item.id,
      name: item.name,
      amount: item.amount,
      currency: item.currency,
      total: item.total,
      current: item.current,
      nextDate: item.nextDate.toISOString().slice(0, 10),
      category: item.category ?? undefined,
      method: item.method ?? undefined,
      important: item.important,
      calendarExported: item.calendarExported,
      status: item.status ?? undefined,
      createdAt: item.createdAt.toISOString(),
    }))
  );
});

calendarRouter.post('/installments', async (req, res) => {
  const parsed = installmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
  }
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const data = parsed.data;
  const created = await getInstallmentModel().create({
    data: {
      userId: req.userId,
      duoId: scope.type === 'duo' ? scope.duoId : null,
      name: data.name,
      amount: data.amount,
      currency: data.currency,
      total: data.total,
      current: data.current,
      nextDate: new Date(data.nextDate + 'T00:00:00'),
      category: data.category?.trim() ? data.category.trim() : null,
      method: data.method?.trim() ? data.method.trim() : null,
      important: data.important ?? false,
      calendarExported: data.calendarExported ?? false,
      status: data.status ?? 'active',
    },
  });
  return res.status(201).json({
    id: created.id,
    name: created.name,
    amount: created.amount,
    currency: created.currency,
    total: created.total,
    current: created.current,
    nextDate: created.nextDate.toISOString().slice(0, 10),
    category: created.category ?? undefined,
    method: created.method ?? undefined,
    important: created.important,
    calendarExported: created.calendarExported,
    status: created.status ?? undefined,
    createdAt: created.createdAt.toISOString(),
  });
});

calendarRouter.put('/installments/:id', async (req, res) => {
  const parsed = installmentSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
  }
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const { id } = req.params;
  const existing = await getInstallmentModel().findFirst({
    where: scope.type === 'duo' ? { id, duoId: scope.duoId } : { id, userId: req.userId, duoId: null },
  });
  if (!existing) {
    return res.status(404).json({ error: 'Cuota no encontrada.' });
  }
  const data = parsed.data;
  const updated = await getInstallmentModel().update({
    where: { id },
    data: {
      name: data.name ?? existing.name,
      amount: data.amount ?? existing.amount,
      currency: data.currency ?? existing.currency,
      total: typeof data.total === 'number' ? data.total : existing.total,
      current: typeof data.current === 'number' ? data.current : existing.current,
      nextDate: data.nextDate ? new Date(data.nextDate + 'T00:00:00') : existing.nextDate,
      category: typeof data.category === 'string' ? data.category.trim() || null : existing.category,
      method: typeof data.method === 'string' ? data.method.trim() || null : existing.method,
      important: typeof data.important === 'boolean' ? data.important : existing.important,
      calendarExported:
        typeof data.calendarExported === 'boolean' ? data.calendarExported : existing.calendarExported,
      status: data.status ?? existing.status,
    },
  });
  return res.json({
    id: updated.id,
    name: updated.name,
    amount: updated.amount,
    currency: updated.currency,
    total: updated.total,
    current: updated.current,
    nextDate: updated.nextDate.toISOString().slice(0, 10),
    category: updated.category ?? undefined,
    method: updated.method ?? undefined,
    important: updated.important,
    calendarExported: updated.calendarExported,
    status: updated.status ?? undefined,
    createdAt: updated.createdAt.toISOString(),
  });
});

calendarRouter.delete('/installments/:id', async (req, res) => {
  const { id } = req.params;
  const scope = await resolveDuoScope(req.userId, req.query.duoId);
  if ('status' in scope) {
    return res.status(scope.status).json({ error: scope.message });
  }
  const existing = await getInstallmentModel().findFirst({
    where: scope.type === 'duo' ? { id, duoId: scope.duoId } : { id, userId: req.userId, duoId: null },
  });
  if (!existing) {
    return res.status(404).json({ error: 'Cuota no encontrada.' });
  }
  await getInstallmentModel().delete({ where: { id } });
  return res.status(204).send();
});
