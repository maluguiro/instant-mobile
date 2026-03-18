import { Request, Response } from 'express';
import { z } from 'zod';

import { prisma } from '../services/prisma';

export async function getProfile(req: Request, res: Response) {
  const userId = req.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }
  return res.json({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt });
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
});

export async function updateProfile(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
  }
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: parsed.data,
  });
  return res.json({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt });
}
