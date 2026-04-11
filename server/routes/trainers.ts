import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/client';
import { cities, users, trainerGrades } from '../db/schema';
import { authMiddleware, trainerMiddleware } from '../middleware/auth';
import { trainerGradeSchema } from '@shared/validation';
import { getExercisesForCity } from '../services/exercises';
import {
  getMergedExercises,
  syncFromSheets,
  writeExerciseToSheet,
} from '../services/sheets-sync';
import type { JwtPayload } from '../middleware/auth';
import type { City, User } from '@shared/types';
import type { TrainerGradesResponse, TrainerExerciseItem } from '@shared/api';

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

function rowToTeam(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    login: row.login,
    role: row.role as User['role'],
    teamName: row.teamName,
    cityId: row.cityId,
    createdAt: row.createdAt,
  };
}

// List all cities (trainer)
router.get('/trainer/cities', authMiddleware, trainerMiddleware, (c) => {
  const rows = db.select().from(cities).all();
  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  return c.json(sorted.map(rowToCity));
});

// List teams in a city (trainer)
router.get(
  '/trainer/cities/:cityId/teams',
  authMiddleware,
  trainerMiddleware,
  (c) => {
    const cityId = c.req.param('cityId');
    const rows = db
      .select()
      .from(users)
      .where(and(eq(users.cityId, cityId), eq(users.role, 'team')))
      .all();
    const sorted = [...rows].sort((a, b) =>
      (a.teamName ?? a.login).localeCompare(b.teamName ?? b.login, 'ru'),
    );
    return c.json(sorted.map(rowToTeam));
  },
);

function buildGradesResponse(
  cityRow: typeof cities.$inferSelect,
  team: typeof users.$inferSelect,
): TrainerGradesResponse {
  const exerciseList = getExercisesForCity(cityRow.id);

  const trainerRows = db
    .select({
      exerciseNumber: trainerGrades.exerciseNumber,
    })
    .from(trainerGrades)
    .where(eq(trainerGrades.teamUserId, team.id))
    .all();
  const trainerSet = new Set(trainerRows.map((r) => r.exerciseNumber));

  const sheetCols = team.teamName
    ? getMergedExercises(cityRow.name, team.teamName)
    : Array(9).fill(false);

  const exercises: TrainerExerciseItem[] = exerciseList.map((ex) => {
    const trainerHas = trainerSet.has(ex.number);
    const sheetHas = sheetCols[ex.number - 1] === true;
    let source: 'sheet' | 'trainer' | null = null;
    if (trainerHas) source = 'trainer';
    else if (sheetHas) source = 'sheet';
    return {
      number: ex.number,
      name: ex.name,
      description: ex.description,
      completed: trainerHas || sheetHas,
      source,
    };
  });

  return {
    team: {
      id: team.id,
      teamName: team.teamName,
      login: team.login,
    },
    exercises,
  };
}

// Get team grades (trainer)
router.get(
  '/trainer/cities/:cityId/teams/:teamId/grades',
  authMiddleware,
  trainerMiddleware,
  (c) => {
    const cityId = c.req.param('cityId');
    const teamId = c.req.param('teamId');

    const cityRow = db.select().from(cities).where(eq(cities.id, cityId)).get();
    if (!cityRow) return c.json({ error: 'City not found' }, 404);

    const team = db.select().from(users).where(eq(users.id, teamId)).get();
    if (!team || team.cityId !== cityId || team.role !== 'team') {
      return c.json({ error: 'Team not found' }, 404);
    }

    return c.json(buildGradesResponse(cityRow, team));
  },
);

// Set / unset a grade (trainer)
router.post(
  '/trainer/cities/:cityId/teams/:teamId/grades',
  authMiddleware,
  trainerMiddleware,
  async (c) => {
    const cityId = c.req.param('cityId');
    const teamId = c.req.param('teamId');
    const trainer = c.get('user');

    const body = await c.req.json();
    const parsed = trainerGradeSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }
    const { exerciseNumber, completed } = parsed.data;

    const cityRow = db.select().from(cities).where(eq(cities.id, cityId)).get();
    if (!cityRow) return c.json({ error: 'City not found' }, 404);

    const team = db.select().from(users).where(eq(users.id, teamId)).get();
    if (!team || team.cityId !== cityId || team.role !== 'team') {
      return c.json({ error: 'Team not found' }, 404);
    }
    if (!team.teamName) {
      return c.json({ error: 'Team has no team name' }, 400);
    }

    const existing = db
      .select()
      .from(trainerGrades)
      .where(
        and(
          eq(trainerGrades.teamUserId, team.id),
          eq(trainerGrades.exerciseNumber, exerciseNumber),
        ),
      )
      .get();

    if (completed) {
      if (!existing) {
        db.insert(trainerGrades)
          .values({
            id: nanoid(),
            teamUserId: team.id,
            exerciseNumber,
            gradedByUserId: trainer.sub,
            createdAt: new Date().toISOString(),
          })
          .run();
      }
    } else if (existing) {
      db.delete(trainerGrades).where(eq(trainerGrades.id, existing.id)).run();
    }

    // Mirror to Google Sheets (best-effort)
    void writeExerciseToSheet(
      cityRow.name,
      team.teamName,
      exerciseNumber,
      completed,
    ).then((ok) => {
      if (ok) {
        // Re-sync so the leaderboard reflects the change.
        syncFromSheets().catch((err) =>
          console.error('[trainer] post-grade sync failed:', err),
        );
      }
    });

    // Return the freshly-merged state (trainer-write is reflected immediately
    // because the DB row is in place; sheet write happens in the background).
    return c.json(buildGradesResponse(cityRow, team));
  },
);

export default router;
