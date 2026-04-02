import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { cities } from '../db/schema';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import type { JwtPayload } from '../middleware/auth';
import type { TimerState } from '@shared/types';

const router = new Hono<{ Variables: { user: JwtPayload } }>();

function computeTimer(city: typeof cities.$inferSelect): TimerState {
  const totalSeconds = city.durationMin * 60;

  if (city.timerStatus === 'pending' || !city.startTime) {
    return {
      status: city.timerStatus as TimerState['status'],
      remainingSeconds: totalSeconds,
      startTime: city.startTime,
      durationMin: city.durationMin,
    };
  }

  if (city.timerStatus === 'paused') {
    return {
      status: 'paused',
      remainingSeconds: city.pausedAt ?? totalSeconds,
      startTime: city.startTime,
      durationMin: city.durationMin,
    };
  }

  if (city.timerStatus === 'finished') {
    return {
      status: 'finished',
      remainingSeconds: 0,
      startTime: city.startTime,
      durationMin: city.durationMin,
    };
  }

  // Running
  const elapsed = Math.floor(
    (Date.now() - new Date(city.startTime).getTime()) / 1000,
  );
  const remaining = Math.max(0, totalSeconds - elapsed);

  return {
    status: remaining <= 0 ? 'finished' : 'running',
    remainingSeconds: remaining,
    startTime: city.startTime,
    durationMin: city.durationMin,
  };
}

// Get timer state
router.get('/cities/:cityId/timer', authMiddleware, (c) => {
  const city = db
    .select()
    .from(cities)
    .where(eq(cities.id, c.req.param('cityId')))
    .get();

  if (!city) return c.json({ error: 'City not found' }, 404);
  return c.json(computeTimer(city));
});

// Start timer (admin)
router.post(
  '/cities/:cityId/timer/start',
  authMiddleware,
  adminMiddleware,
  (c) => {
    const cityId = c.req.param('cityId');
    const city = db.select().from(cities).where(eq(cities.id, cityId)).get();
    if (!city) return c.json({ error: 'City not found' }, 404);

    db.update(cities)
      .set({
        timerStatus: 'running',
        startTime: new Date().toISOString(),
        pausedAt: null,
      })
      .where(eq(cities.id, cityId))
      .run();

    const updated = db
      .select()
      .from(cities)
      .where(eq(cities.id, cityId))
      .get()!;
    return c.json(computeTimer(updated));
  },
);

// Pause timer (admin)
router.post(
  '/cities/:cityId/timer/pause',
  authMiddleware,
  adminMiddleware,
  (c) => {
    const cityId = c.req.param('cityId');
    const city = db.select().from(cities).where(eq(cities.id, cityId)).get();
    if (!city) return c.json({ error: 'City not found' }, 404);
    if (city.timerStatus !== 'running') {
      return c.json({ error: 'Timer is not running' }, 400);
    }

    const timer = computeTimer(city);

    db.update(cities)
      .set({
        timerStatus: 'paused',
        pausedAt: timer.remainingSeconds,
      })
      .where(eq(cities.id, cityId))
      .run();

    const updated = db
      .select()
      .from(cities)
      .where(eq(cities.id, cityId))
      .get()!;
    return c.json(computeTimer(updated));
  },
);

// Resume timer (admin)
router.post(
  '/cities/:cityId/timer/resume',
  authMiddleware,
  adminMiddleware,
  (c) => {
    const cityId = c.req.param('cityId');
    const city = db.select().from(cities).where(eq(cities.id, cityId)).get();
    if (!city) return c.json({ error: 'City not found' }, 404);
    if (city.timerStatus !== 'paused') {
      return c.json({ error: 'Timer is not paused' }, 400);
    }

    const remaining = city.pausedAt ?? city.durationMin * 60;
    // Set startTime so that elapsed = totalSeconds - remaining
    const newStart = new Date(
      Date.now() - (city.durationMin * 60 - remaining) * 1000,
    ).toISOString();

    db.update(cities)
      .set({
        timerStatus: 'running',
        startTime: newStart,
        pausedAt: null,
      })
      .where(eq(cities.id, cityId))
      .run();

    const updated = db
      .select()
      .from(cities)
      .where(eq(cities.id, cityId))
      .get()!;
    return c.json(computeTimer(updated));
  },
);

// Set remaining time (admin) — adjust on the fly
router.post(
  '/cities/:cityId/timer/set-remaining',
  authMiddleware,
  adminMiddleware,
  async (c) => {
    const cityId = c.req.param('cityId');
    const city = db.select().from(cities).where(eq(cities.id, cityId)).get();
    if (!city) return c.json({ error: 'City not found' }, 404);

    const body = await c.req.json<{ remainingSeconds: number }>();
    const remaining = Math.max(0, Math.floor(body.remainingSeconds));

    if (city.timerStatus === 'running') {
      // Recalculate startTime so that elapsed = totalSeconds - remaining
      const totalSeconds = city.durationMin * 60;
      const newStart = new Date(
        Date.now() - (totalSeconds - remaining) * 1000,
      ).toISOString();
      db.update(cities)
        .set({ startTime: newStart })
        .where(eq(cities.id, cityId))
        .run();
    } else if (city.timerStatus === 'paused') {
      db.update(cities)
        .set({ pausedAt: remaining })
        .where(eq(cities.id, cityId))
        .run();
    } else if (city.timerStatus === 'pending') {
      // Update durationMin to match
      db.update(cities)
        .set({ durationMin: Math.ceil(remaining / 60) })
        .where(eq(cities.id, cityId))
        .run();
    }

    const updated = db
      .select()
      .from(cities)
      .where(eq(cities.id, cityId))
      .get()!;
    return c.json(computeTimer(updated));
  },
);

// Stop timer (admin)
router.post(
  '/cities/:cityId/timer/stop',
  authMiddleware,
  adminMiddleware,
  (c) => {
    const cityId = c.req.param('cityId');
    const city = db.select().from(cities).where(eq(cities.id, cityId)).get();
    if (!city) return c.json({ error: 'City not found' }, 404);

    db.update(cities)
      .set({ timerStatus: 'finished', pausedAt: null })
      .where(eq(cities.id, cityId))
      .run();

    const updated = db
      .select()
      .from(cities)
      .where(eq(cities.id, cityId))
      .get()!;
    return c.json(computeTimer(updated));
  },
);

export default router;
