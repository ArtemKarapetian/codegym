import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/client';
import { cities } from '../db/schema';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { createCitySchema, updateCitySchema } from '@shared/validation';
import type { JwtPayload } from '../middleware/auth';
import type { City } from '@shared/types';
import type { PublicCity } from '@shared/api';

const router = new Hono<{ Variables: { user: JwtPayload } }>();

function rowToCity(row: typeof cities.$inferSelect): City {
  let exerciseNames: string[] | null = null;
  if (row.exerciseNames) {
    try {
      const parsed: unknown = JSON.parse(row.exerciseNames);
      if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
        exerciseNames = parsed as string[];
      }
    } catch {
      exerciseNames = null;
    }
  }
  return {
    id: row.id,
    name: row.name,
    timezone: row.timezone,
    startTime: row.startTime,
    durationMin: row.durationMin,
    timerStatus: row.timerStatus as City['timerStatus'],
    contestDate: row.contestDate ?? null,
    sheetId: row.sheetId ?? null,
    sheetRange: row.sheetRange,
    exerciseNames,
    createdAt: row.createdAt,
  };
}

function sortByNameRu<T extends { name: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

// Public list of cities (no auth — powers the landing page grid)
router.get('/public', (c) => {
  const rows = sortByNameRu(db.select().from(cities).all());
  const result: PublicCity[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    timezone: r.timezone,
    contestDate: r.contestDate ?? null,
    timerStatus: r.timerStatus as City['timerStatus'],
  }));
  return c.json(result);
});

// Public single city (no auth — leaderboard page fetches city metadata)
router.get('/public/:id', (c) => {
  const row = db
    .select()
    .from(cities)
    .where(eq(cities.id, c.req.param('id')))
    .get();
  if (!row) return c.json({ error: 'City not found' }, 404);
  return c.json(rowToCity(row));
});

// List all cities (admin)
router.get('/', authMiddleware, adminMiddleware, (c) => {
  const rows = sortByNameRu(db.select().from(cities).all());
  return c.json(rows.map(rowToCity));
});

// Get one city (admin)
router.get('/:id', authMiddleware, adminMiddleware, (c) => {
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
      durationMin: parsed.data.durationMin,
      contestDate: parsed.data.contestDate ?? null,
      sheetId: parsed.data.sheetId ?? null,
      sheetRange: parsed.data.sheetRange ?? 'Таблица',
      exerciseNames: parsed.data.exerciseNames
        ? JSON.stringify(parsed.data.exerciseNames)
        : null,
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

  const patch: Partial<typeof cities.$inferInsert> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.timezone !== undefined) patch.timezone = parsed.data.timezone;
  if (parsed.data.durationMin !== undefined)
    patch.durationMin = parsed.data.durationMin;
  if (parsed.data.contestDate !== undefined)
    patch.contestDate = parsed.data.contestDate ?? null;
  if (parsed.data.sheetId !== undefined)
    patch.sheetId = parsed.data.sheetId ?? null;
  if (parsed.data.sheetRange !== undefined)
    patch.sheetRange = parsed.data.sheetRange;
  if (parsed.data.exerciseNames !== undefined) {
    patch.exerciseNames = parsed.data.exerciseNames
      ? JSON.stringify(parsed.data.exerciseNames)
      : null;
  }

  db.update(cities).set(patch).where(eq(cities.id, id)).run();

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
