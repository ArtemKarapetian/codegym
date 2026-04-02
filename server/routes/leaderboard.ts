import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users, leaderboardCache } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import type { JwtPayload } from '../middleware/auth';
import type { TeamScore, ProblemResult } from '@shared/types';

const router = new Hono<{ Variables: { user: JwtPayload } }>();

function buildLeaderboard(cityId: string, currentUserId?: string): TeamScore[] {
  const rows = db
    .select({
      userId: leaderboardCache.userId,
      login: users.login,
      teamName: users.teamName,
      score: leaderboardCache.score,
      penalty: leaderboardCache.penalty,
      solved: leaderboardCache.solved,
      problems: leaderboardCache.problems,
    })
    .from(leaderboardCache)
    .innerJoin(users, eq(leaderboardCache.userId, users.id))
    .where(eq(leaderboardCache.cityId, cityId))
    .all();

  // Sort: most solved first, then lowest penalty, then highest score
  rows.sort(
    (a, b) => b.solved - a.solved || a.penalty - b.penalty || b.score - a.score,
  );

  return rows.map((r, i) => {
    let problems: Record<string, ProblemResult> = {};
    if (r.problems) {
      try {
        problems = JSON.parse(r.problems);
      } catch {
        // ignore
      }
    }

    return {
      rank: i + 1,
      teamName: r.teamName || r.login,
      score: r.score,
      penalty: r.penalty,
      solved: r.solved,
      problems,
      isCurrentTeam: currentUserId ? r.userId === currentUserId : undefined,
    };
  });
}

// Authenticated leaderboard
router.get('/cities/:cityId/leaderboard', authMiddleware, (c) => {
  const cityId = c.req.param('cityId');
  const user = c.get('user');
  return c.json(buildLeaderboard(cityId, user.sub));
});

// Public leaderboard (no auth, for big screen)
router.get('/public/cities/:cityId/leaderboard', (c) => {
  const cityId = c.req.param('cityId');
  return c.json(buildLeaderboard(cityId));
});

export default router;
