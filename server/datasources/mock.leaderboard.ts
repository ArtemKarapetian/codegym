import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/client';
import { users, leaderboardCache } from '../db/schema';
import type { ILeaderboardSource, LeaderboardEntry } from './types';

export class MockLeaderboardSource implements ILeaderboardSource {
  pollIntervalMs = 0; // No polling needed for mock

  async getLeaderboard(cityId: string): Promise<LeaderboardEntry[]> {
    // Read from leaderboard_cache
    const rows = db
      .select({
        login: users.login,
        teamName: users.teamName,
        score: leaderboardCache.score,
        penalty: leaderboardCache.penalty,
        solved: leaderboardCache.solved,
      })
      .from(leaderboardCache)
      .innerJoin(users, eq(leaderboardCache.userId, users.id))
      .where(eq(leaderboardCache.cityId, cityId))
      .all();

    return rows.map((r) => ({
      teamLogin: r.login,
      score: r.score,
      penalty: r.penalty,
      solved: r.solved,
    }));
  }
}

// Helper to update a team's score (used by seed and admin)
export function upsertLeaderboardEntry(
  cityId: string,
  userId: string,
  score: number,
  penalty: number,
  solved: number,
) {
  const existing = db
    .select()
    .from(leaderboardCache)
    .where(
      and(
        eq(leaderboardCache.cityId, cityId),
        eq(leaderboardCache.userId, userId),
      ),
    )
    .get();

  const now = new Date().toISOString();

  if (existing) {
    db.update(leaderboardCache)
      .set({ score, penalty, solved, updatedAt: now })
      .where(eq(leaderboardCache.id, existing.id))
      .run();
  } else {
    db.insert(leaderboardCache)
      .values({
        id: nanoid(),
        cityId,
        userId,
        score,
        penalty,
        solved,
        updatedAt: now,
      })
      .run();
  }
}
