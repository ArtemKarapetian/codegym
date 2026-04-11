import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { cities, users, trainerGrades } from '../db/schema';
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
  rowIndex: number; // 1-indexed sheet row, useful for write-back
}

const PROBLEM_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

// ── In-memory leaderboard store ──

// cityId -> TeamScore[]
const leaderboardStore = new Map<string, TeamScore[]>();

// cityName -> teamNames (from last sync, for account generation)
const teamsByCity = new Map<string, string[]>();

// "cityName||teamName" -> 1-indexed sheet row in the "Упражнения" tab.
// Populated on each sync; used by writeExerciseToSheet to avoid an extra read.
const exerciseRowIndex = new Map<string, number>();

// "cityName||teamName" -> 9-bool array merged from sheet + DB trainer grades.
// Populated on each sync; used by trainer grade endpoint to render state.
const mergedExerciseMap = new Map<string, boolean[]>();

export function getTeamsByCity(): Map<string, string[]> {
  return teamsByCity;
}

export function getMergedExercises(
  cityName: string,
  teamName: string,
): boolean[] {
  return (
    mergedExerciseMap.get(`${cityName}||${teamName}`) ?? Array(9).fill(false)
  );
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
    if (teams.length === 0) continue;
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
    // Sheet rows are 1-indexed; row 1 is the header.
    results.push({ city, team, columns, rowIndex: i + 1 });
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

  // Refresh the row-index cache so writeExerciseToSheet can target cells.
  exerciseRowIndex.clear();
  for (const row of exerciseRows) {
    exerciseRowIndex.set(`${row.city}||${row.team}`, row.rowIndex);
  }

  // Build exercise lookup: city+team -> columns (sheet truth, then OR DB).
  const exerciseMap = new Map<string, boolean[]>();
  for (const row of exerciseRows) {
    exerciseMap.set(`${row.city}||${row.team}`, [...row.columns]);
  }

  // Build city name -> id map from DB
  const allCities = db.select().from(cities).all();
  const cityMap = new Map<string, string>();
  const cityIdToName = new Map<string, string>();
  for (const c of allCities) {
    cityMap.set(c.name.toLowerCase(), c.id);
    cityIdToName.set(c.id, c.name);
  }

  // OR-merge trainer grades from DB into exerciseMap. The sheet remains the
  // source of truth; trainer grades only set additional cells to true.
  const dbGradeRows = db
    .select({
      teamUserId: trainerGrades.teamUserId,
      exerciseNumber: trainerGrades.exerciseNumber,
    })
    .from(trainerGrades)
    .all();

  if (dbGradeRows.length > 0) {
    const teamUserIds = Array.from(
      new Set(dbGradeRows.map((g) => g.teamUserId)),
    );
    const teamUserById = new Map<
      string,
      { teamName: string | null; cityId: string | null }
    >();
    for (const id of teamUserIds) {
      const u = db.select().from(users).where(eq(users.id, id)).get();
      if (u) teamUserById.set(id, { teamName: u.teamName, cityId: u.cityId });
    }
    for (const g of dbGradeRows) {
      const u = teamUserById.get(g.teamUserId);
      if (!u || !u.teamName || !u.cityId) continue;
      const cityName = cityIdToName.get(u.cityId);
      if (!cityName) continue;
      const key = `${cityName}||${u.teamName}`;
      let cols = exerciseMap.get(key);
      if (!cols) {
        cols = Array(9).fill(false);
        exerciseMap.set(key, cols);
      }
      const idx = g.exerciseNumber - 1;
      if (idx >= 0 && idx < 9) cols[idx] = true;
    }
  }

  // Snapshot the merged map for trainer reads
  mergedExerciseMap.clear();
  for (const [k, v] of exerciseMap) {
    mergedExerciseMap.set(k, [...v]);
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

// ── Write-back via Google service account ──

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

let cachedServiceAccount: ServiceAccountKey | null | undefined = undefined;

function loadServiceAccount(): ServiceAccountKey | null {
  if (cachedServiceAccount !== undefined) return cachedServiceAccount;

  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const path = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;

  let raw: string | null = null;
  if (inline) {
    raw = inline;
  } else if (path) {
    try {
      // Lazy require to avoid loading fs eagerly in environments that don't need it
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs') as typeof import('fs');
      raw = fs.readFileSync(path, 'utf8');
    } catch (err) {
      console.error('[sheets-sync] failed to read service account file:', err);
      cachedServiceAccount = null;
      return null;
    }
  }

  if (!raw) {
    cachedServiceAccount = null;
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ServiceAccountKey;
    if (!parsed.client_email || !parsed.private_key) {
      console.error(
        '[sheets-sync] service account JSON missing client_email/private_key',
      );
      cachedServiceAccount = null;
      return null;
    }
    cachedServiceAccount = parsed;
    return parsed;
  } catch (err) {
    console.error('[sheets-sync] failed to parse service account JSON:', err);
    cachedServiceAccount = null;
    return null;
  }
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(sa: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60) {
    return cachedAccessToken.token;
  }

  const { SignJWT, importPKCS8 } = await import('jose');
  const key = await importPKCS8(sa.private_key, 'RS256');

  const jwt = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/spreadsheets',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience(sa.token_uri || 'https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const tokenRes = await fetch(
    sa.token_uri || 'https://oauth2.googleapis.com/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }).toString(),
    },
  );

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(
      `Service account token exchange failed: ${tokenRes.status} ${text}`,
    );
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedAccessToken = {
    token: tokenJson.access_token,
    expiresAt: now + tokenJson.expires_in,
  };
  return cachedAccessToken.token;
}

/**
 * Convert exerciseNumber (1-9) to its column letter in the "Упражнения"
 * sheet. The parser reads columns at index 3..11 (0-based), which are
 * spreadsheet columns D..L (1-based letters).
 */
function exerciseColumnLetter(exerciseNumber: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + 2 + exerciseNumber);
}

/**
 * Look up the 1-indexed sheet row for (cityName, teamName) by reading
 * columns B:C from the exercises sheet. Used as a fallback when the cache
 * is empty (e.g., the trainer grades a team before the first sync).
 */
async function findExerciseRow(
  cityName: string,
  teamName: string,
): Promise<number | null> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!apiKey || !spreadsheetId) return null;

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Упражнения!B:C')}?key=${apiKey}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = (await res.json()) as { values?: string[][] };
  const rows = data.values ?? [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const c = (r[0] ?? '').trim();
    const t = (r[1] ?? '').trim();
    if (c === cityName && t === teamName) return i + 1;
  }
  return null;
}

/**
 * Write a single exercise cell back to the Google Sheets "Упражнения" tab.
 *
 * Returns true if the write succeeded, false if skipped (no service account
 * or row not found). Never throws — failures are logged so the caller can
 * still persist the grade locally.
 */
export async function writeExerciseToSheet(
  cityName: string,
  teamName: string,
  exerciseNumber: number,
  value: boolean,
): Promise<boolean> {
  const sa = loadServiceAccount();
  if (!sa) {
    console.warn(
      '[sheets-sync] no service account configured; skipping sheet write',
    );
    return false;
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) return false;

  let row = exerciseRowIndex.get(`${cityName}||${teamName}`) ?? null;
  if (!row) {
    row = await findExerciseRow(cityName, teamName);
    if (row) exerciseRowIndex.set(`${cityName}||${teamName}`, row);
  }
  if (!row) {
    console.warn(
      `[sheets-sync] no row found for ${cityName} / ${teamName} in Упражнения`,
    );
    return false;
  }

  const col = exerciseColumnLetter(exerciseNumber);
  const range = `Упражнения!${col}${row}`;

  try {
    const token = await getAccessToken(sa);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [[value ? 'TRUE' : '']],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(
        `[sheets-sync] cell update failed for ${range}: ${res.status} ${text}`,
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error('[sheets-sync] writeExerciseToSheet error:', err);
    return false;
  }
}
