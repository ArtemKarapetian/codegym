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
}

const leaderboardStore = new Map<string, CityLeaderboard>();

export function getLeaderboardForCity(cityId: string): CityLeaderboard {
  return leaderboardStore.get(cityId) ?? { teams: [] };
}

// ── Sync ──

export interface SyncResult {
  synced: number;
  cities: number;
  failed: { cityId: string; cityName: string; error: string }[];
}

interface TaskCell {
  solved: boolean;
  // Wrong attempts before success for a solved task ("+" = 0, "+2" = 2).
  // Undefined semantics for unsolved cells — we don't use it there.
  badAttempts: number;
}

function parseTaskCell(val: string): TaskCell {
  const v = (val ?? '').trim();
  if (!v) return { solved: false, badAttempts: 0 };
  if (v.startsWith('+')) {
    const rest = v.slice(1);
    const n = rest ? Number(rest) : 0;
    return { solved: true, badAttempts: Number.isFinite(n) ? n : 0 };
  }
  return { solved: false, badAttempts: 0 };
}

// Exercise cells use a different vocabulary than task cells: Minsk writes
// "зачет", other cities may use "+", "✓", "да", "yes", "1", etc. Be liberal:
// a cell is marked done if it is non-empty and doesn't look like an explicit
// "not done" marker (empty, "-", "−", "0", "нет", "no", or anything starting
// with a minus sign).
function isExerciseDone(val: string): boolean {
  const v = (val ?? '').trim().toLowerCase();
  if (!v) return false;
  if (
    v === '0' ||
    v === '-' ||
    v === '−' ||
    v === 'нет' ||
    v === 'no' ||
    v == 'незачет'
  ) {
    return false;
  }
  if (v.startsWith('-') || v.startsWith('−')) return false;
  return true;
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

// Count-based gating: score = min(rawSolved, exercisesDone). When all 9
// exercises are done the last (10th) task doesn't need an extra exercise, so
// all 10 tasks can count. If score < rawSolved, the earliest solved tasks
// (by column position) are the ones that count.
function applyPerTaskGating(
  taskFlags: boolean[],
  exercisesDone: number,
): boolean[] {
  const rawSolved = taskFlags.filter(Boolean).length;
  const allowedCount = Math.min(
    rawSolved,
    exercisesDone >= EXERCISE_COUNT ? TASK_COUNT : exercisesDone,
  );

  const result = taskFlags.map(() => false);
  let remaining = allowedCount;
  for (let i = 0; i < taskFlags.length && remaining > 0; i++) {
    if (taskFlags[i]) {
      result[i] = true;
      remaining--;
    }
  }
  return result;
}

interface ParsedRow {
  login: string;
  teamName: string;
  taskCells: TaskCell[];
  exerciseFlags: boolean[];
  sheetPenalty: number;
}

function parseSheet(values: string[][]): { rows: ParsedRow[] } {
  if (!values || values.length < 3) {
    return { rows: [] };
  }

  const rows: ParsedRow[] = [];
  for (let i = 2; i < values.length; i++) {
    const r = values[i] ?? [];
    const login = (r[0] ?? '').trim();
    if (!login) continue;
    const teamName = (r[1] ?? '').trim() || login;

    const taskCells: TaskCell[] = [];
    for (let k = 0; k < TASK_COUNT; k++) {
      taskCells.push(parseTaskCell(r[TASKS_COL_START + k] ?? ''));
    }

    const exerciseFlags: boolean[] = [];
    for (let k = 0; k < EXERCISE_COUNT; k++) {
      exerciseFlags.push(isExerciseDone(r[EXERCISES_COL_START + k] ?? ''));
    }

    const sheetPenalty = parsePenalty(r[PENALTY_COL] ?? '');

    rows.push({ login, teamName, taskCells, exerciseFlags, sheetPenalty });
  }

  return { rows };
}

type PenaltyMode = 'sheet' | 'computed';

function rowsToTeamScores(
  rows: ParsedRow[],
  penaltyMode: PenaltyMode,
): TeamScore[] {
  // 'sheet' mode auto-falls-back to 'computed' when the sheet's Штраф column
  // is blank/zero for EVERY team — otherwise the whole board would show zero
  // penalty and ties wouldn't break. Operators only see 'sheet' vs 'computed'
  // in the UI; this fallback is invisible and kicks in when needed.
  const anySheetPenalty = rows.some((r) => r.sheetPenalty > 0);
  const effectiveMode: PenaltyMode =
    penaltyMode === 'sheet' && !anySheetPenalty ? 'computed' : penaltyMode;

  const scores: TeamScore[] = rows.map((row) => {
    const exercisesDone = row.exerciseFlags.filter(Boolean).length;
    const taskFlags = row.taskCells.map((c) => c.solved);
    const gatedTaskFlags = applyPerTaskGating(taskFlags, exercisesDone);
    const score = gatedTaskFlags.filter(Boolean).length;

    // In 'computed' mode penalty = sum of bad attempts over gated-solved
    // tasks. Only count attempts for tasks that actually count — solving a
    // task that's still locked by gating shouldn't add penalty.
    let penalty: number;
    if (effectiveMode === 'computed') {
      penalty = 0;
      for (let k = 0; k < TASK_COUNT; k++) {
        if (gatedTaskFlags[k]) penalty += row.taskCells[k].badAttempts;
      }
    } else {
      penalty = row.sheetPenalty;
    }

    const problems: Record<string, ProblemResult> = {};
    for (let k = 0; k < TASK_COUNT; k++) {
      problems[PROBLEM_LETTERS[k]] = { solved: gatedTaskFlags[k] };
    }

    return {
      rank: 0,
      teamName: row.teamName,
      login: row.login,
      score,
      penalty,
      problems,
    };
  });

  scores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.penalty - b.penalty;
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
        const { rows } = parseSheet(data.values ?? []);
        const teams = rowsToTeamScores(rows, city.penaltyMode as PenaltyMode);
        leaderboardStore.set(city.id, { teams });
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
