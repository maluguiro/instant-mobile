import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'instant_dev_secret';
const JWT_EXPIRES_IN = '7d';

export function createToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: string };
}
