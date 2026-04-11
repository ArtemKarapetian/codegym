import { serve } from '@hono/node-server';
import { createApp } from './app';
import { syncFromSheets } from './services/sheets-sync';

// Run migrations on startup
import './db/migrate';
import { ensureAdmin, ensureCities } from './db/bootstrap';

// Bootstrap runs after migrations: on a brand-new VPS this fills in cities
// and creates the admin, and on upgrade from a pre-leaderboard DB it vacuums
// stale users, guarantees a fresh admin password from env, and backfills
// missing sheet_ids.
ensureAdmin();
ensureCities();

const app = createApp();
const port = Number(process.env.PORT) || 3001;

console.log(`Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' });

// ── Auto-sync from Google Sheets ──
const SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS) || 30_000; // default 30s

async function autoSync() {
  try {
    const result = await syncFromSheets();
    const parts = [`cities=${result.cities}`, `rows=${result.synced}`];
    if (result.failed.length) {
      parts.push(`failed=${result.failed.map((f) => f.cityName).join(',')}`);
    }
    console.log(`[auto-sync] ${parts.join(' ')}`);
  } catch (err) {
    console.error('[auto-sync] error:', err);
  }
}

// First sync after 5s, then every SYNC_INTERVAL_MS
setTimeout(() => {
  autoSync();
  setInterval(autoSync, SYNC_INTERVAL_MS);
}, 5000);
