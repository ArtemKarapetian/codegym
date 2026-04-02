import { db } from '../db/client';
import { cities } from '../db/schema';
import type { TeamScore, ProblemResult } from '@shared/types';

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
  columns: boolean[];
}

const PROBLEM_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

function parseSheet(csv: string): TeamRow[] {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];

  // header: №, Город, Команда, Col1..Col9, [Итого, ...]
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

// ── In-memory leaderboard store ──

// cityId -> TeamScore[]
const leaderboardStore = new Map<string, TeamScore[]>();

export function getLeaderboardForCity(cityId: string): TeamScore[] {
  return leaderboardStore.get(cityId) ?? [];
}

export function getCityStats() {
  const stats = new Map<
    string,
    {
      teams: number;
      totalSolved: number;
      maxSolved: number;
      topTeam: string | null;
    }
  >();
  for (const [cityId, teams] of leaderboardStore) {
    let maxSolved = 0;
    let topTeam: string | null = null;
    let totalSolved = 0;
    for (const t of teams) {
      totalSolved += t.solved;
      if (t.solved > maxSolved) {
        maxSolved = t.solved;
        topTeam = t.teamName;
      }
    }
    stats.set(cityId, {
      teams: teams.length,
      totalSolved,
      maxSolved,
      topTeam,
    });
  }
  return stats;
}

// ── Sync ──

export interface SyncResult {
  synced: number;
  skippedNoCity: string[];
}

async function fetchWithRetry(url: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
      return await r.text();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
  throw new Error('Unreachable');
}

export async function syncFromSheets(
  tasksUrl: string,
  exercisesUrl: string,
): Promise<SyncResult> {
  const [tasksCsv, exercisesCsv] = await Promise.all([
    fetchWithRetry(tasksUrl),
    fetchWithRetry(exercisesUrl),
  ]);

  const taskRows = parseSheet(tasksCsv);
  const exerciseRows = parseSheet(exercisesCsv);

  // Build exercise lookup: city+team -> columns
  const exerciseMap = new Map<string, boolean[]>();
  for (const row of exerciseRows) {
    exerciseMap.set(`${row.city}||${row.team}`, row.columns);
  }

  // Build city name -> id map from DB
  const allCities = db.select().from(cities).all();
  const cityMap = new Map<string, string>();
  for (const c of allCities) {
    cityMap.set(c.name.toLowerCase(), c.id);
  }

  // Group scores by cityId
  const byCityId = new Map<string, TeamScore[]>();
  const result: SyncResult = { synced: 0, skippedNoCity: [] };

  for (const taskRow of taskRows) {
    const cityId = cityMap.get(taskRow.city.toLowerCase());
    if (!cityId) {
      if (!result.skippedNoCity.includes(taskRow.city)) {
        result.skippedNoCity.push(taskRow.city);
      }
      continue;
    }

    const exercises =
      exerciseMap.get(`${taskRow.city}||${taskRow.team}`) ??
      Array(9).fill(false);
    const tasksDone = taskRow.columns.filter(Boolean).length;
    const exercisesDone = exercises.filter(Boolean).length;
    const scored = Math.min(tasksDone, exercisesDone + 1);

    // Build problems map
    const problems: Record<string, ProblemResult> = {};
    for (let i = 0; i < 9; i++) {
      if (taskRow.columns[i]) {
        problems[PROBLEM_LETTERS[i]] = {
          score: 1,
          penalty: 0,
          attempts: 1,
          solved: true,
        };
      }
    }

    if (!byCityId.has(cityId)) byCityId.set(cityId, []);
    byCityId.get(cityId)!.push({
      rank: 0, // computed below
      teamName: taskRow.team,
      score: scored,
      penalty: 0,
      solved: scored,
      problems,
    });

    result.synced++;
  }

  // Sort and assign ranks, then store
  for (const [cityId, teams] of byCityId) {
    teams.sort((a, b) => b.solved - a.solved || a.penalty - b.penalty);
    teams.forEach((t, i) => (t.rank = i + 1));
    leaderboardStore.set(cityId, teams);
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
