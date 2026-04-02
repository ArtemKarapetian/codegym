import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/client';
import { zones, teamProgress } from '../db/schema';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { createZoneSchema, updateZoneSchema } from '@shared/validation';
import type { JwtPayload } from '../middleware/auth';
import type { ZoneData } from '@shared/types';

const router = new Hono<{ Variables: { user: JwtPayload } }>();

function rowToZone(
  row: typeof zones.$inferSelect,
  completed = false,
): ZoneData {
  return {
    id: row.id,
    name: row.name,
    type: row.type as ZoneData['type'],
    position: { x: row.positionX ?? 0, y: row.positionY ?? 0 },
    size: { width: row.sizeWidth ?? 140, height: row.sizeHeight ?? 120 },
    description: row.description ?? undefined,
    difficulty: (row.difficulty as ZoneData['difficulty']) ?? undefined,
    completed,
    ejudgeProblemId: row.ejudgeProblemId ?? undefined,
    problemLetter: row.problemLetter ?? undefined,
    exercise: row.exercise ?? undefined,
    sortOrder: row.sortOrder,
  };
}

// List zones for a city
router.get('/cities/:cityId/zones', authMiddleware, (c) => {
  const cityId = c.req.param('cityId');
  const user = c.get('user');

  const rows = db.select().from(zones).where(eq(zones.cityId, cityId)).all();

  // If team user, fetch their progress
  if (user.role === 'team') {
    const progress = db
      .select()
      .from(teamProgress)
      .where(eq(teamProgress.userId, user.sub))
      .all();

    const completedZones = new Set(
      progress.filter((p) => p.completed).map((p) => p.zoneId),
    );

    return c.json(rows.map((r) => rowToZone(r, completedZones.has(r.id))));
  }

  return c.json(rows.map((r) => rowToZone(r)));
});

// Get single zone
router.get('/cities/:cityId/zones/:id', authMiddleware, (c) => {
  const row = db
    .select()
    .from(zones)
    .where(
      and(
        eq(zones.cityId, c.req.param('cityId')),
        eq(zones.id, c.req.param('id')),
      ),
    )
    .get();

  if (!row) return c.json({ error: 'Zone not found' }, 404);
  return c.json(rowToZone(row));
});

// Create zone (admin)
router.post(
  '/cities/:cityId/zones',
  authMiddleware,
  adminMiddleware,
  async (c) => {
    const cityId = c.req.param('cityId');
    const body = await c.req.json();
    const parsed = createZoneSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const id = nanoid();
    const now = new Date().toISOString();

    db.insert(zones)
      .values({
        id,
        cityId,
        name: parsed.data.name,
        type: parsed.data.type,
        description: parsed.data.description ?? null,
        difficulty: parsed.data.difficulty ?? null,
        positionX: parsed.data.positionX,
        positionY: parsed.data.positionY,
        sizeWidth: parsed.data.sizeWidth,
        sizeHeight: parsed.data.sizeHeight,
        ejudgeProblemId: parsed.data.ejudgeProblemId ?? null,
        sortOrder: parsed.data.sortOrder,
        createdAt: now,
      })
      .run();

    const row = db.select().from(zones).where(eq(zones.id, id)).get()!;
    return c.json(rowToZone(row), 201);
  },
);

// Update zone (admin)
router.put(
  '/cities/:cityId/zones/:id',
  authMiddleware,
  adminMiddleware,
  async (c) => {
    const id = c.req.param('id');
    const existing = db.select().from(zones).where(eq(zones.id, id)).get();
    if (!existing) return c.json({ error: 'Zone not found' }, 404);

    const body = await c.req.json();
    const parsed = updateZoneSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.type !== undefined) updates.type = parsed.data.type;
    if (parsed.data.description !== undefined)
      updates.description = parsed.data.description;
    if (parsed.data.difficulty !== undefined)
      updates.difficulty = parsed.data.difficulty;
    if (parsed.data.positionX !== undefined)
      updates.positionX = parsed.data.positionX;
    if (parsed.data.positionY !== undefined)
      updates.positionY = parsed.data.positionY;
    if (parsed.data.sizeWidth !== undefined)
      updates.sizeWidth = parsed.data.sizeWidth;
    if (parsed.data.sizeHeight !== undefined)
      updates.sizeHeight = parsed.data.sizeHeight;
    if (parsed.data.ejudgeProblemId !== undefined)
      updates.ejudgeProblemId = parsed.data.ejudgeProblemId;
    if (parsed.data.sortOrder !== undefined)
      updates.sortOrder = parsed.data.sortOrder;

    if (Object.keys(updates).length > 0) {
      db.update(zones).set(updates).where(eq(zones.id, id)).run();
    }

    const row = db.select().from(zones).where(eq(zones.id, id)).get()!;
    return c.json(rowToZone(row));
  },
);

// Delete zone (admin)
router.delete(
  '/cities/:cityId/zones/:id',
  authMiddleware,
  adminMiddleware,
  (c) => {
    const id = c.req.param('id');
    const existing = db.select().from(zones).where(eq(zones.id, id)).get();
    if (!existing) return c.json({ error: 'Zone not found' }, 404);

    db.delete(zones).where(eq(zones.id, id)).run();
    return c.json({ ok: true });
  },
);

// Mark zone completed for a team (admin)
router.post(
  '/cities/:cityId/progress/:zoneId/complete',
  authMiddleware,
  adminMiddleware,
  async (c) => {
    const zoneId = c.req.param('zoneId');
    const body = await c.req.json();
    const userId = body.userId as string;

    if (!userId) return c.json({ error: 'userId required' }, 400);

    const existing = db
      .select()
      .from(teamProgress)
      .where(
        and(eq(teamProgress.userId, userId), eq(teamProgress.zoneId, zoneId)),
      )
      .get();

    if (existing) {
      db.update(teamProgress)
        .set({ completed: true, completedAt: new Date().toISOString() })
        .where(eq(teamProgress.id, existing.id))
        .run();
    } else {
      db.insert(teamProgress)
        .values({
          id: nanoid(),
          userId,
          zoneId,
          completed: true,
          completedAt: new Date().toISOString(),
        })
        .run();
    }

    return c.json({ ok: true });
  },
);

// Get team's own progress
router.get('/cities/:cityId/progress', authMiddleware, (c) => {
  const user = c.get('user');

  const rows = db
    .select()
    .from(teamProgress)
    .where(eq(teamProgress.userId, user.sub))
    .all();

  return c.json(
    rows.map((r) => ({
      zoneId: r.zoneId,
      completed: r.completed,
      completedAt: r.completedAt,
    })),
  );
});

export default router;
