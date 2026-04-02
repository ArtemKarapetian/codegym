import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { cities } from '../db/schema';
import { getLeaderboardForCity } from '../services/sheets-sync';
import { authMiddleware } from '../middleware/auth';
import type { JwtPayload } from '../middleware/auth';
import type { TeamScore } from '@shared/types';

const FREEZE_MINUTES = 30;

// In-memory snapshot per city. Once frozen, stays frozen until admin unfreezes.
const frozenSnapshots = new Map<string, TeamScore[]>();

function shouldShowLive(cityId: string): boolean {
  if (frozenSnapshots.has(cityId)) return false;

  const city = db.select().from(cities).where(eq(cities.id, cityId)).get();
  if (!city) return true;
  if (city.timerStatus !== 'running' || !city.startTime) return true;

  const totalSeconds = city.durationMin * 60;
  const elapsed = Math.floor(
    (Date.now() - new Date(city.startTime).getTime()) / 1000,
  );
  const remaining = totalSeconds - elapsed;

  if (remaining <= FREEZE_MINUTES * 60) return false;
  return true;
}

export function unfreezeLeaderboard(cityId: string) {
  frozenSnapshots.delete(cityId);
}

function getLeaderboard(cityId: string): TeamScore[] {
  const live = shouldShowLive(cityId);

  if (!live) {
    const snap = frozenSnapshots.get(cityId);
    if (snap) return snap;

    // First freeze — take snapshot
    const data = getLeaderboardForCity(cityId);
    frozenSnapshots.set(cityId, data);
    return data;
  }

  return getLeaderboardForCity(cityId);
}

const router = new Hono<{ Variables: { user: JwtPayload } }>();

// Authenticated leaderboard
router.get('/cities/:cityId/leaderboard', authMiddleware, (c) => {
  const cityId = c.req.param('cityId');
  return c.json(getLeaderboard(cityId));
});

// Public leaderboard (no auth, for big screen)
router.get('/public/cities/:cityId/leaderboard', (c) => {
  const cityId = c.req.param('cityId');
  const isFrozen = frozenSnapshots.has(cityId);
  c.header('X-Leaderboard-Frozen', isFrozen ? '1' : '0');
  return c.json(getLeaderboard(cityId));
});

// Admin: unfreeze leaderboard
router.post('/cities/:cityId/leaderboard/unfreeze', authMiddleware, (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  const cityId = c.req.param('cityId');
  unfreezeLeaderboard(cityId);
  return c.json({ ok: true, message: 'Leaderboard unfrozen' });
});

export default router;
