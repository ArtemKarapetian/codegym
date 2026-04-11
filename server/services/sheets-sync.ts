import { db } from '../db/client';
import { cities } from '../db/schema';
import type { TeamScore, ProblemResult } from '@shared/types';

// ── Layout constants ──
//
// Every city sheet follows the same shape:
//
//   Row 1: merged group headers ("Логин в Ejudje", "Командa",
//          "Задачи по программированию", "Сколько задач решено", "Штраф",
//          "Спортивные задания", "Победители (распределение мест)")
//   Row 2: sub-column labels (blank, blank, A..J, blank, blank, 1..9, blank)
//   Row 3+: team rows
//
//   Col A  (idx 0): login in ejudge
//   Col B  (idx 1): team display name (may be blank — fallback to login)
//   Col C..L (idx 2..11): 10 programming problems A..J
//   Col M (idx 12): "Сколько задач решено" (ignored — we recount)
//   Col N (idx 13): penalty
//   Col O..W (idx 14..22): 9 exercises
//   Col X (idx 23): winners column (ignored)

export const TASK_COUNT = 10;
export const EXERCISE_COUNT = 9;
export const PROBLEM_LETTERS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
];

const TASKS_COL_START = 2;
const PENALTY_COL = 13;
const EXERCISES_COL_START = 14;

// ── Store ──

interface CityLeaderboard {
  teams: TeamScore[];
  exerciseNamesFromSheet: string[]; // row-1 labels for exercise cols, if any
}

const leaderboardStore = new Map<string, CityLeaderboard>();

export function getLeaderboardForCity(cityId: string): CityLeaderboard {
  return (
    leaderboardStore.get(cityId) ?? {
      teams: [],
      exerciseNamesFromSheet: [],
    }
  );
}

// ── Sync ──

export interface SyncResult {
  synced: number;
  cities: number;
  failed: { cityId: string; cityName: string; error: string }[];
}

function isSolved(val: string): boolean {
  const v = (val ?? '').trim();
  if (!v) return false;
  // "+", "+1", "+2" = solved. "-", "-1" = not solved.
  if (v.startsWith('+')) return true;
  return false;
}

function parsePenalty(val: string): number {
  if (!val) return 0;
  const n = Number(val.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error(`Fetch failed: ${r.status} ${await r.text()}`);
      return r;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Unreachable');
}

function sheetValuesUrl(sheetId: string, range: string): string {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) throw new Error('Missing env: GOOGLE_SHEETS_API_KEY');
  return (
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/` +
    `${encodeURIComponent(range)}?key=${apiKey}`
  );
}

function applyGating(tasksSolved: number, exercisesDone: number): number {
  // Exercise k unlocks task k+1; the last exercise is optional (task 10 counts
  // as soon as 8 exercises are done). So unlockCap = exercisesDone >= 8 ? 10
  // : exercisesDone + 1.
  const unlockCap =
    exercisesDone >= EXERCISE_COUNT - 1
      ? TASK_COUNT
      : Math.min(TASK_COUNT, exercisesDone + 1);
  return Math.min(tasksSolved, unlockCap);
}

interface ParsedRow {
  login: string;
  teamName: string;
  taskFlags: boolean[];
  exerciseFlags: boolean[];
  penalty: number;
}

function parseSheet(values: string[][]): {
  rows: ParsedRow[];
  exerciseNames: string[];
} {
  if (!values || values.length < 3) {
    return { rows: [], exerciseNames: [] };
  }

  // Row 1 carries merged group headers; individual cells for exercise
  // columns may contain a per-city name. If a cell is blank, fall back to
  // a numeric label later.
  const headerRow = values[0] ?? [];
  const exerciseNames: string[] = [];
  for (let i = 0; i < EXERCISE_COUNT; i++) {
    const raw = (headerRow[EXERCISES_COL_START + i] ?? '').trim();
    exerciseNames.push(raw);
  }

  const rows: ParsedRow[] = [];
  for (let i = 2; i < values.length; i++) {
    const r = values[i] ?? [];
    const login = (r[0] ?? '').trim();
    if (!login) continue;
    const teamName = (r[1] ?? '').trim() || login;

    const taskFlags: boolean[] = [];
    for (let k = 0; k < TASK_COUNT; k++) {
      taskFlags.push(isSolved(r[TASKS_COL_START + k] ?? ''));
    }

    const exerciseFlags: boolean[] = [];
    for (let k = 0; k < EXERCISE_COUNT; k++) {
      exerciseFlags.push(isSolved(r[EXERCISES_COL_START + k] ?? ''));
    }

    const penalty = parsePenalty(r[PENALTY_COL] ?? '');

    rows.push({ login, teamName, taskFlags, exerciseFlags, penalty });
  }

  return { rows, exerciseNames };
}

function rowsToTeamScores(rows: ParsedRow[]): TeamScore[] {
  const scores: TeamScore[] = rows.map((row) => {
    const tasksSolved = row.taskFlags.filter(Boolean).length;
    const exercisesDone = row.exerciseFlags.filter(Boolean).length;
    const score = applyGating(tasksSolved, exercisesDone);

    const problems: Record<string, ProblemResult> = {};
    for (let k = 0; k < TASK_COUNT; k++) {
      problems[PROBLEM_LETTERS[k]] = { solved: row.taskFlags[k] };
    }

    return {
      rank: 0,
      teamName: row.teamName,
      login: row.login,
      score,
      penalty: row.penalty,
      tasksSolved,
      exercisesDone,
      problems,
      exercises: row.exerciseFlags,
    };
  });

  scores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.penalty !== b.penalty) return a.penalty - b.penalty;
    if (b.tasksSolved !== a.tasksSolved) return b.tasksSolved - a.tasksSolved;
    return b.exercisesDone - a.exercisesDone;
  });
  scores.forEach((t, i) => {
    t.rank = i + 1;
  });

  return scores;
}

export async function syncFromSheets(): Promise<SyncResult> {
  const allCities = db.select().from(cities).all();
  const result: SyncResult = { synced: 0, cities: 0, failed: [] };

  await Promise.all(
    allCities.map(async (city) => {
      if (!city.sheetId) return;
      result.cities++;
      try {
        const url = sheetValuesUrl(city.sheetId, city.sheetRange);
        const res = await fetchWithRetry(url);
        const data = (await res.json()) as { values?: string[][] };
        const { rows, exerciseNames } = parseSheet(data.values ?? []);
        const teams = rowsToTeamScores(rows);
        leaderboardStore.set(city.id, {
          teams,
          exerciseNamesFromSheet: exerciseNames,
        });
        result.synced += teams.length;
      } catch (err) {
        result.failed.push({
          cityId: city.id,
          cityName: city.name,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }),
  );

  return result;
}

// ── Exercise name resolution ──

export function resolveExerciseNames(
  cityExerciseNames: string[] | null,
  fromSheet: string[],
): string[] {
  const out: string[] = [];
  for (let i = 0; i < EXERCISE_COUNT; i++) {
    const explicit = cityExerciseNames?.[i]?.trim();
    if (explicit) {
      out.push(explicit);
      continue;
    }
    const sheetName = fromSheet[i]?.trim();
    if (sheetName) {
      out.push(sheetName);
      continue;
    }
    out.push(`Упражнение ${i + 1}`);
  }
  return out;
}
