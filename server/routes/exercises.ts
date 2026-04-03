import { Hono } from 'hono';
import { eq, isNull, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/client';
import { exercises } from '../db/schema';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import type { JwtPayload } from '../middleware/auth';

interface ExerciseItem {
  number: number;
  name: string;
  description: string | null;
  isOverride: boolean; // true = city-specific, false = base
}

const router = new Hono<{ Variables: { user: JwtPayload } }>();

function getExercisesForCity(cityId: string | null): ExerciseItem[] {
  // Get base exercises
  const baseRows = db
    .select()
    .from(exercises)
    .where(isNull(exercises.cityId))
    .all();

  const baseMap = new Map<number, (typeof baseRows)[0]>();
  for (const r of baseRows) {
    baseMap.set(r.exerciseNumber, r);
  }

  // Get city overrides
  const overrideMap = new Map<number, (typeof baseRows)[0]>();
  if (cityId) {
    const overrideRows = db
      .select()
      .from(exercises)
      .where(eq(exercises.cityId, cityId))
      .all();
    for (const r of overrideRows) {
      overrideMap.set(r.exerciseNumber, r);
    }
  }

  // Merge: city override wins over base
  const result: ExerciseItem[] = [];
  for (let n = 1; n <= 9; n++) {
    const override = overrideMap.get(n);
    const base = baseMap.get(n);
    const row = override || base;
    result.push({
      number: n,
      name: row?.name ?? `Упражнение ${n}`,
      description: row?.description ?? null,
      isOverride: !!override,
    });
  }
  return result;
}

// Get base exercises
router.get('/exercises/base', authMiddleware, adminMiddleware, (c) => {
  return c.json(getExercisesForCity(null));
});

// Set base exercises (admin)
router.put('/exercises/base', authMiddleware, adminMiddleware, async (c) => {
  const body =
    await c.req.json<
      { number: number; name: string; description?: string }[]
    >();

  for (const item of body) {
    const existing = db
      .select()
      .from(exercises)
      .where(
        and(
          isNull(exercises.cityId),
          eq(exercises.exerciseNumber, item.number),
        ),
      )
      .get();

    if (existing) {
      db.update(exercises)
        .set({ name: item.name, description: item.description ?? null })
        .where(eq(exercises.id, existing.id))
        .run();
    } else {
      db.insert(exercises)
        .values({
          id: nanoid(),
          cityId: null,
          exerciseNumber: item.number,
          name: item.name,
          description: item.description ?? null,
        })
        .run();
    }
  }

  return c.json({ ok: true });
});

// Get exercises for a city (merged: override + base fallback)
router.get('/cities/:cityId/exercises', (c) => {
  const cityId = c.req.param('cityId');
  return c.json(getExercisesForCity(cityId));
});

// Set city-specific exercise overrides (admin)
router.put(
  '/cities/:cityId/exercises',
  authMiddleware,
  adminMiddleware,
  async (c) => {
    const cityId = c.req.param('cityId');
    const body =
      await c.req.json<
        { number: number; name: string; description?: string }[]
      >();

    for (const item of body) {
      const existing = db
        .select()
        .from(exercises)
        .where(
          and(
            eq(exercises.cityId, cityId),
            eq(exercises.exerciseNumber, item.number),
          ),
        )
        .get();

      if (existing) {
        db.update(exercises)
          .set({ name: item.name, description: item.description ?? null })
          .where(eq(exercises.id, existing.id))
          .run();
      } else {
        db.insert(exercises)
          .values({
            id: nanoid(),
            cityId,
            exerciseNumber: item.number,
            name: item.name,
            description: item.description ?? null,
          })
          .run();
      }
    }

    return c.json({ ok: true });
  },
);

// Delete city override for a specific exercise (revert to base)
router.delete(
  '/cities/:cityId/exercises/:number',
  authMiddleware,
  adminMiddleware,
  (c) => {
    const cityId = c.req.param('cityId');
    const num = parseInt(c.req.param('number'));

    db.delete(exercises)
      .where(
        and(eq(exercises.cityId, cityId), eq(exercises.exerciseNumber, num)),
      )
      .run();

    return c.json({ ok: true });
  },
);

export default router;
