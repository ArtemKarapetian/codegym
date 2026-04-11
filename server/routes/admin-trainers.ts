import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { db } from '../db/client';
import { users } from '../db/schema';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { createTrainerSchema } from '@shared/validation';
import type { JwtPayload } from '../middleware/auth';
import type { User } from '@shared/types';

const router = new Hono<{ Variables: { user: JwtPayload } }>();

function rowToUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    login: row.login,
    role: row.role as User['role'],
    teamName: row.teamName,
    cityId: row.cityId,
    plainPassword: row.plainPassword,
    createdAt: row.createdAt,
  };
}

// List trainers (admin)
router.get('/admin/trainers', authMiddleware, adminMiddleware, (c) => {
  const rows = db.select().from(users).where(eq(users.role, 'trainer')).all();
  const sorted = [...rows].sort((a, b) =>
    (a.teamName ?? a.login).localeCompare(b.teamName ?? b.login, 'ru'),
  );
  return c.json(sorted.map(rowToUser));
});

// Create trainer (admin)
router.post('/admin/trainers', authMiddleware, adminMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = createTrainerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const existing = db
    .select()
    .from(users)
    .where(eq(users.login, parsed.data.login))
    .get();
  if (existing) {
    return c.json({ error: 'Login already taken' }, 409);
  }

  const id = nanoid();
  const now = new Date().toISOString();
  db.insert(users)
    .values({
      id,
      login: parsed.data.login,
      passwordHash: bcrypt.hashSync(parsed.data.password, 10),
      plainPassword: parsed.data.password,
      role: 'trainer',
      teamName: parsed.data.name, // reuse teamName column for display name
      cityId: null,
      createdAt: now,
    })
    .run();

  const row = db.select().from(users).where(eq(users.id, id)).get()!;
  return c.json(rowToUser(row), 201);
});

// Delete trainer (admin)
router.delete('/admin/trainers/:id', authMiddleware, adminMiddleware, (c) => {
  const id = c.req.param('id');
  const existing = db.select().from(users).where(eq(users.id, id)).get();
  if (!existing || existing.role !== 'trainer') {
    return c.json({ error: 'Trainer not found' }, 404);
  }
  db.delete(users).where(eq(users.id, id)).run();
  return c.json({ ok: true });
});

export default router;
