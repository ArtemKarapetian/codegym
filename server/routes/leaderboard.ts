import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { cities } from '../db/schema';
import { getLeaderboardForCity, TASK_COUNT } from '../services/sheets-sync';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import type { JwtPayload } from '../middleware/auth';
import type { TeamScore } from '@shared/types';
import type { LeaderboardResponse } from '@shared/api';

const FREEZE_MINUTES = 30;

// Per-city in-memory freeze snapshot. "manual" means an admin froze it with
// the explicit button; "auto" means we crossed the T-30min threshold. Both
// stay until admin unfreezes.
interface FrozenSnapshot {
  teams: TeamScore[];
  kind: 'auto' | 'manual';
}
const frozenSnapshots = new Map<string, FrozenSnapshot>();

function shouldAutoFreeze(city: typeof cities.$inferSelect): boolean {
  if (city.timerStatus !== 'running' || !city.startTime) return false;
  const totalSeconds = city.durationMin * 60;
  const elapsed = Math.floor(
    (Date.now() - new Date(city.startTime).getTime()) / 1000,
  );
  const remaining = totalSeconds - elapsed;
  return remaining <= FREEZE_MINUTES * 60;
}

function buildResponse(city: typeof cities.$inferSelect): LeaderboardResponse {
  const snapshot = getLeaderboardForCity(city.id);

  let teams: TeamScore[];
  let frozen = false;

  const existing = frozenSnapshots.get(city.id);
  if (existing) {
    teams = existing.teams;
    frozen = true;
  } else if (shouldAutoFreeze(city)) {
    frozenSnapshots.set(city.id, { teams: snapshot.teams, kind: 'auto' });
    teams = snapshot.teams;
    frozen = true;
  } else {
    teams = snapshot.teams;
  }

  return {
    teams,
    frozen,
    taskCount: TASK_COUNT,
  };
}

const router = new Hono<{ Variables: { user: JwtPayload } }>();

// Public leaderboard — powers both the big-screen display and the landing page
router.get('/public/cities/:cityId/leaderboard', (c) => {
  const cityId = c.req.param('cityId');
  const city = db.select().from(cities).where(eq(cities.id, cityId)).get();
  if (!city) return c.json({ error: 'City not found' }, 404);
  return c.json(buildResponse(city));
});

// Admin: freeze leaderboard manually
router.post(
  '/cities/:cityId/leaderboard/freeze',
  authMiddleware,
  adminMiddleware,
  (c) => {
    const cityId = c.req.param('cityId');
    const city = db.select().from(cities).where(eq(cities.id, cityId)).get();
    if (!city) return c.json({ error: 'City not found' }, 404);

    const snapshot = getLeaderboardForCity(cityId);
    frozenSnapshots.set(cityId, { teams: snapshot.teams, kind: 'manual' });
    return c.json({ ok: true, frozen: true });
  },
);

// Admin: unfreeze leaderboard (manual or auto)
router.post(
  '/cities/:cityId/leaderboard/unfreeze',
  authMiddleware,
  adminMiddleware,
  (c) => {
    const cityId = c.req.param('cityId');
    frozenSnapshots.delete(cityId);
    return c.json({ ok: true, frozen: false });
  },
);

// Hook for timer route: when admin restarts the contest, drop any freeze.
export function clearFreeze(cityId: string) {
  frozenSnapshots.delete(cityId);
}

export default router;
