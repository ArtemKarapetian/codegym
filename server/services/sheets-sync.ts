import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/client';
import { cities, users, leaderboardCache } from '../db/schema';

// ── CSV parsing ──

function parseCSV(raw: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inQuotes) {
      if (ch === '"' && raw[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current.trim());
        current = '';
      } else if (ch === '\n' || (ch === '\r' && raw[i + 1] === '\n')) {
        row.push(current.trim());
        current = '';
        if (row.some((c) => c !== '')) rows.push(row);
        row = [];
        if (ch === '\r') i++;
      } else {
        current += ch;
      }
    }
  }
  // last row
  row.push(current.trim());
  if (row.some((c) => c !== '')) rows.push(row);

  return rows;
}

function isTruthy(val: string): boolean {
  const v = val.toUpperCase().trim();
  return v === 'TRUE' || v === '1' || v === 'YES' || v === 'ДА';
}

// ── Types ──

interface TeamRow {
  city: string;
  team: string;
  /** boolean per column index 1..9 */
  columns: boolean[];
}

function parseSheet(csv: string): TeamRow[] {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];

  // header row: №, Город, Команда, Col1, Col2, ..., Col9, [Итого, ...]
  // data columns start at index 3
  const results: TeamRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const city = r[1] ?? '';
    const team = r[2] ?? '';
    if (!city || !team) continue;

    const columns: boolean[] = [];
    for (let j = 3; j < 3 + 9; j++) {
      columns.push(isTruthy(r[j] ?? ''));
    }
    results.push({ city, team, columns });
  }
  return results;
}

// ── Scoring ──

const PROBLEM_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

interface TeamScore {
  city: string;
  team: string;
  tasks: boolean[];
  exercises: boolean[];
  /** effective solved = min(tasksDone, exercisesDone + 1) */
  scored: number;
}

function computeScores(
  taskRows: TeamRow[],
  exerciseRows: TeamRow[],
): TeamScore[] {
  // Build lookup: city+team -> exercises
  const exerciseMap = new Map<string, boolean[]>();
  for (const row of exerciseRows) {
    exerciseMap.set(`${row.city}||${row.team}`, row.columns);
  }

  const results: TeamScore[] = [];
  for (const taskRow of taskRows) {
    const key = `${taskRow.city}||${taskRow.team}`;
    const exercises = exerciseMap.get(key) ?? Array(9).fill(false);
    const tasksDone = taskRow.columns.filter(Boolean).length;
    const exercisesDone = exercises.filter(Boolean).length;
    // After the last task, exercise not required → +1
    const scored = Math.min(tasksDone, exercisesDone + 1);

    results.push({
      city: taskRow.city,
      team: taskRow.team,
      tasks: taskRow.columns,
      exercises,
      scored,
    });
  }

  return results;
}

// ── Sync to DB ──

export interface SyncResult {
  synced: number;
  skippedNoCity: string[];
  skippedNoTeam: string[];
  created: number;
}

export async function syncFromSheets(
  tasksUrl: string,
  exercisesUrl: string,
): Promise<SyncResult> {
  // Fetch both CSVs
  const [tasksCsv, exercisesCsv] = await Promise.all([
    fetch(tasksUrl).then((r) => {
      if (!r.ok) throw new Error(`Tasks sheet fetch failed: ${r.status}`);
      return r.text();
    }),
    fetch(exercisesUrl).then((r) => {
      if (!r.ok) throw new Error(`Exercises sheet fetch failed: ${r.status}`);
      return r.text();
    }),
  ]);

  const taskRows = parseSheet(tasksCsv);
  const exerciseRows = parseSheet(exercisesCsv);
  const scores = computeScores(taskRows, exerciseRows);

  // Load cities from DB, build name -> id map
  const allCities = db.select().from(cities).all();
  const cityMap = new Map<string, string>();
  for (const c of allCities) {
    cityMap.set(c.name.toLowerCase(), c.id);
  }

  const result: SyncResult = {
    synced: 0,
    skippedNoCity: [],
    skippedNoTeam: [],
    created: 0,
  };

  const now = new Date().toISOString();

  for (const score of scores) {
    const cityId = cityMap.get(score.city.toLowerCase());
    if (!cityId) {
      if (!result.skippedNoCity.includes(score.city)) {
        result.skippedNoCity.push(score.city);
      }
      continue;
    }

    // Find team user by teamName + cityId
    let user = db
      .select()
      .from(users)
      .where(and(eq(users.teamName, score.team), eq(users.cityId, cityId)))
      .get();

    // Auto-create team if not found
    if (!user) {
      const userId = nanoid();
      const login = `team-${nanoid(8)}`;
      // Use bcryptjs to hash a random password (teams log in differently)
      db.insert(users)
        .values({
          id: userId,
          login,
          passwordHash: '$__sheets_sync__', // placeholder, not a valid bcrypt hash
          role: 'team',
          teamName: score.team,
          cityId,
          createdAt: now,
        })
        .run();
      user = db.select().from(users).where(eq(users.id, userId)).get()!;
      result.created++;
    }

    // Build problems JSON
    const problems: Record<
      string,
      { score: number; penalty: number; attempts: number; solved: boolean }
    > = {};
    for (let i = 0; i < 9; i++) {
      if (score.tasks[i]) {
        problems[PROBLEM_LETTERS[i]] = {
          score: 1,
          penalty: 0,
          attempts: 1,
          solved: true,
        };
      }
    }

    // Upsert leaderboard_cache
    const existing = db
      .select()
      .from(leaderboardCache)
      .where(
        and(
          eq(leaderboardCache.cityId, cityId),
          eq(leaderboardCache.userId, user.id),
        ),
      )
      .get();

    if (existing) {
      db.update(leaderboardCache)
        .set({
          score: score.scored,
          penalty: 0,
          solved: score.scored,
          problems: JSON.stringify(problems),
          updatedAt: now,
        })
        .where(eq(leaderboardCache.id, existing.id))
        .run();
    } else {
      db.insert(leaderboardCache)
        .values({
          id: nanoid(),
          cityId,
          userId: user.id,
          score: score.scored,
          penalty: 0,
          solved: score.scored,
          problems: JSON.stringify(problems),
          updatedAt: now,
        })
        .run();
    }

    result.synced++;
  }

  return result;
}

// ── Sheet URL helpers ──

export function getSheetUrls() {
  const base = process.env.GOOGLE_SHEET_BASE_URL;
  const tasksGid = process.env.GOOGLE_SHEET_TASKS_GID;
  const exercisesGid = process.env.GOOGLE_SHEET_EXERCISES_GID;

  if (!base || !tasksGid || !exercisesGid) {
    throw new Error(
      'Missing env: GOOGLE_SHEET_BASE_URL, GOOGLE_SHEET_TASKS_GID, GOOGLE_SHEET_EXERCISES_GID',
    );
  }

  return {
    tasks: `${base}?gid=${tasksGid}&single=true&output=csv`,
    exercises: `${base}?gid=${exercisesGid}&single=true&output=csv`,
  };
}
