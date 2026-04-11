import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '../db/client';
import { users } from '../db/schema';
import { loginSchema } from '@shared/validation';
import { signToken, authMiddleware } from '../middleware/auth';
import type { JwtPayload } from '../middleware/auth';
import type { LoginResponse, MeResponse } from '@shared/api';
import type { User } from '@shared/types';

const auth = new Hono<{ Variables: { user: JwtPayload } }>();

function rowToUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    login: row.login,
    role: row.role as User['role'],
    createdAt: row.createdAt,
  };
}

auth.post('/login', async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid credentials' }, 400);
  }

  const { login, password } = parsed.data;
  const row = db.select().from(users).where(eq(users.login, login)).get();
  if (!row) return c.json({ error: 'Invalid login or password' }, 401);

  const valid = bcrypt.compareSync(password, row.passwordHash);
  if (!valid) return c.json({ error: 'Invalid login or password' }, 401);

  const token = await signToken({
    sub: row.id,
    role: row.role as User['role'],
  });

  return c.json({ token, user: rowToUser(row) } satisfies LoginResponse);
});

auth.get('/me', authMiddleware, (c) => {
  const jwt = c.get('user');
  const row = db.select().from(users).where(eq(users.id, jwt.sub)).get();
  if (!row) return c.json({ error: 'User not found' }, 404);
  return c.json({ user: rowToUser(row) } satisfies MeResponse);
});

export default auth;
