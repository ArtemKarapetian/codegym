import { db } from '../db/client';
import { cities } from '../db/schema';
import type { TeamScore, ProblemResult } from '@shared/types';

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

// ── In-memory leaderboard store ──

// cityId -> TeamScore[]
const leaderboardStore = new Map<string, TeamScore[]>();

// cityName -> teamNames (from last sync, for account generation)
const teamsByCity = new Map<string, string[]>();

export function getTeamsByCity(): Map<string, string[]> {
  return teamsByCity;
}

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

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error(`Fetch failed: ${r.status} ${await r.text()}`);
      return r;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
  throw new Error('Unreachable');
}

/** Parse Google Sheets API JSON response into TeamRow[] */
function parseApiResponse(data: { values?: string[][] }): TeamRow[] {
  const rows = data.values;
  if (!rows || rows.length < 2) return [];

  const results: TeamRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const city = (r[1] ?? '').trim();
    const team = (r[2] ?? '').trim();
    if (!city || !team) continue;

    const columns: boolean[] = [];
    for (let j = 3; j < 3 + 9; j++) {
      columns.push(isTruthy(r[j] ?? ''));
    }
    results.push({ city, team, columns });
  }
  return results;
}

export async function syncFromSheets(): Promise<SyncResult> {
  const { tasksUrl, exercisesUrl } = getSheetUrls();

  const [tasksRes, exercisesRes] = await Promise.all([
    fetchWithRetry(tasksUrl),
    fetchWithRetry(exercisesUrl),
  ]);

  const tasksData = (await tasksRes.json()) as { values?: string[][] };
  const exercisesData = (await exercisesRes.json()) as { values?: string[][] };

  const taskRows = parseApiResponse(tasksData);
  const exerciseRows = parseApiResponse(exercisesData);

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

  // Group scores by cityId + collect team names by city
  const byCityId = new Map<string, TeamScore[]>();
  const newTeamsByCity = new Map<string, string[]>();
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

    // Track teams by city name
    if (!newTeamsByCity.has(taskRow.city)) newTeamsByCity.set(taskRow.city, []);
    newTeamsByCity.get(taskRow.city)!.push(taskRow.team);

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

  // Update teams by city
  teamsByCity.clear();
  for (const [city, teams] of newTeamsByCity) {
    teamsByCity.set(city, teams);
  }

  return result;
}

// ── Sheet URL helpers ──

export function getSheetUrls() {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!apiKey || !spreadsheetId) {
    throw new Error(
      'Missing env: GOOGLE_SHEETS_API_KEY, GOOGLE_SHEETS_SPREADSHEET_ID',
    );
  }

  const base = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values`;
  return {
    tasksUrl: `${base}/${encodeURIComponent('Задачи')}?key=${apiKey}`,
    exercisesUrl: `${base}/${encodeURIComponent('Упражнения')}?key=${apiKey}`,
  };
}
