import { Request, Response } from 'express';
import { z } from 'zod';

import { prisma } from '../services/prisma';
import { comparePassword, hashPassword } from '../services/password';

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
  email: z.string().email().optional(),
  currentPassword: z.string().min(6).optional(),
  newPassword: z.string().min(6).optional(),
});

export async function updateProfile(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  const { name, email, currentPassword, newPassword } = parsed.data;

  if (email && email !== user.email) {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ error: 'El email ya está registrado.' });
    }
  }

  let passwordHash = user.passwordHash;
  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Necesitás tu contraseña actual.' });
    }
    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'La contraseña actual no es correcta.' });
    }
    passwordHash = await hashPassword(newPassword);
  }

  const updated = await prisma.user.update({
    where: { id: req.userId },
    data: {
      name: name ?? user.name,
      email: email ?? user.email,
      passwordHash,
    },
  });
  return res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    createdAt: updated.createdAt,
  });
}
