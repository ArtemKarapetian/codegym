import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/client';
import { funPoints } from '../db/schema';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import type { JwtPayload } from '../middleware/auth';

const router = new Hono<{ Variables: { user: JwtPayload } }>();

// Get fun points for a city (public)
router.get('/public/cities/:cityId/fun-points', (c) => {
  const cityId = c.req.param('cityId');
  const rows = db
    .select()
    .from(funPoints)
    .where(eq(funPoints.cityId, cityId))
    .all();

  const result: Record<string, number> = {};
  for (const r of rows) {
    result[r.teamName] = r.points;
  }
  return c.json(result);
});

// Set fun points for a team (admin)
router.post(
  '/cities/:cityId/fun-points',
  authMiddleware,
  adminMiddleware,
  async (c) => {
    const cityId = c.req.param('cityId');
    const body = await c.req.json<{ teamName: string; points: number }>();

    const existing = db
      .select()
      .from(funPoints)
      .where(
        and(
          eq(funPoints.cityId, cityId),
          eq(funPoints.teamName, body.teamName),
        ),
      )
      .get();

    if (existing) {
      db.update(funPoints)
        .set({ points: body.points })
        .where(eq(funPoints.id, existing.id))
        .run();
    } else {
      db.insert(funPoints)
        .values({
          id: nanoid(),
          cityId,
          teamName: body.teamName,
          points: body.points,
        })
        .run();
    }

    return c.json({ ok: true });
  },
);

export default router;
