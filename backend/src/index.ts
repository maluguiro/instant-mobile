import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { authRouter } from './routes/auth';
import { authMiddleware } from './middleware/auth';
import { getProfile, updateProfile } from './routes/profile';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);

app.get('/me', authMiddleware, getProfile);
app.put('/me', authMiddleware, updateProfile);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Instant API running on :${port}`);
});
