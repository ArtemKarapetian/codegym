import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { db } from '../db/client';
import { users } from '../db/schema';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { createTeamSchema, bulkCreateTeamsSchema } from '@shared/validation';
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
    createdAt: row.createdAt,
  };
}

// List teams for a city (admin)
router.get('/cities/:cityId/teams', authMiddleware, adminMiddleware, (c) => {
  const cityId = c.req.param('cityId');
  const rows = db
    .select()
    .from(users)
    .where(and(eq(users.cityId, cityId), eq(users.role, 'team')))
    .all();

  return c.json(rows.map(rowToUser));
});

// Create team (admin)
router.post(
  '/cities/:cityId/teams',
  authMiddleware,
  adminMiddleware,
  async (c) => {
    const cityId = c.req.param('cityId');
    const body = await c.req.json();
    const parsed = createTeamSchema.safeParse(body);
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
    const hash = bcrypt.hashSync(parsed.data.password, 10);

    db.insert(users)
      .values({
        id,
        login: parsed.data.login,
        passwordHash: hash,
        role: 'team',
        teamName: parsed.data.teamName,
        cityId,
        createdAt: now,
      })
      .run();

    const row = db.select().from(users).where(eq(users.id, id)).get()!;
    return c.json(rowToUser(row), 201);
  },
);

// Bulk create teams (admin)
router.post(
  '/cities/:cityId/teams/bulk',
  authMiddleware,
  adminMiddleware,
  async (c) => {
    const cityId = c.req.param('cityId');
    const body = await c.req.json();
    const parsed = bulkCreateTeamsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const created: User[] = [];
    const errors: string[] = [];

    for (const team of parsed.data.teams) {
      const existing = db
        .select()
        .from(users)
        .where(eq(users.login, team.login))
        .get();
      if (existing) {
        errors.push(`Login "${team.login}" already taken`);
        continue;
      }

      const id = nanoid();
      const now = new Date().toISOString();
      const hash = bcrypt.hashSync(team.password, 10);

      db.insert(users)
        .values({
          id,
          login: team.login,
          passwordHash: hash,
          role: 'team',
          teamName: team.teamName,
          cityId,
          createdAt: now,
        })
        .run();

      const row = db.select().from(users).where(eq(users.id, id)).get()!;
      created.push(rowToUser(row));
    }

    return c.json({ created, errors }, errors.length > 0 ? 207 : 201);
  },
);

// Delete team (admin)
router.delete(
  '/cities/:cityId/teams/:id',
  authMiddleware,
  adminMiddleware,
  (c) => {
    const id = c.req.param('id');
    const existing = db.select().from(users).where(eq(users.id, id)).get();
    if (!existing) return c.json({ error: 'Team not found' }, 404);

    db.delete(users).where(eq(users.id, id)).run();
    return c.json({ ok: true });
  },
);

export default router;
