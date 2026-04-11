import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/client';
import { cities } from '../db/schema';
import { getCityStats } from '../services/sheets-sync';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { createCitySchema, updateCitySchema } from '@shared/validation';
import type { JwtPayload } from '../middleware/auth';
import type { City } from '@shared/types';

const router = new Hono<{ Variables: { user: JwtPayload } }>();

function rowToCity(row: typeof cities.$inferSelect): City {
  return {
    id: row.id,
    name: row.name,
    timezone: row.timezone,
    startTime: row.startTime,
    durationMin: row.durationMin,
    timerStatus: row.timerStatus as City['timerStatus'],
    mapEnabled: row.mapEnabled,
    contestDate: row.contestDate ?? null,
    chatUrl: row.chatUrl ?? null,
    createdAt: row.createdAt,
  };
}

// Public list of cities with summary stats (no auth, for landing page)
router.get('/public', (c) => {
  const rows = db.select().from(cities).all();

  const statsMap = getCityStats();

  const result = rows.map((row) => {
    const city = rowToCity(row);
    const s = statsMap.get(row.id);
    return {
      ...city,
      stats:
        s && s.teams > 0
          ? {
              teams: s.teams,
              avgSolved: Math.round((s.totalSolved / s.teams) * 10) / 10,
              maxSolved: s.maxSolved,
              topTeam: s.topTeam,
            }
          : null,
    };
  });

  return c.json(result);
});

// List all cities
router.get('/', authMiddleware, (c) => {
  const rows = db.select().from(cities).all();
  return c.json(rows.map(rowToCity));
});

// Get one city
router.get('/:id', authMiddleware, (c) => {
  const row = db
    .select()
    .from(cities)
    .where(eq(cities.id, c.req.param('id')))
    .get();
  if (!row) return c.json({ error: 'City not found' }, 404);
  return c.json(rowToCity(row));
});

// Create city (admin)
router.post('/', authMiddleware, adminMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = createCitySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const id = nanoid();
  const now = new Date().toISOString();

  db.insert(cities)
    .values({
      id,
      name: parsed.data.name,
      timezone: parsed.data.timezone,
      startTime: parsed.data.startTime ?? null,
      durationMin: parsed.data.durationMin,
      mapEnabled: parsed.data.mapEnabled,
      contestDate: parsed.data.contestDate ?? null,
      chatUrl: parsed.data.chatUrl ?? null,
      timerStatus: 'pending',
      createdAt: now,
    })
    .run();

  const row = db.select().from(cities).where(eq(cities.id, id)).get()!;
  return c.json(rowToCity(row), 201);
});

// Update city (admin)
router.put('/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = c.req.param('id');
  const existing = db.select().from(cities).where(eq(cities.id, id)).get();
  if (!existing) return c.json({ error: 'City not found' }, 404);

  const body = await c.req.json();
  const parsed = updateCitySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  db.update(cities).set(parsed.data).where(eq(cities.id, id)).run();

  const row = db.select().from(cities).where(eq(cities.id, id)).get()!;
  return c.json(rowToCity(row));
});

// Delete city (admin)
router.delete('/:id', authMiddleware, adminMiddleware, (c) => {
  const id = c.req.param('id');
  const existing = db.select().from(cities).where(eq(cities.id, id)).get();
  if (!existing) return c.json({ error: 'City not found' }, 404);

  db.delete(cities).where(eq(cities.id, id)).run();
  return c.json({ ok: true });
});

export default router;
