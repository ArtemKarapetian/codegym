import { serve } from '@hono/node-server';
import { createApp } from './app';
import { syncFromSheets, getSheetUrls } from './services/sheets-sync';

// Run migrations on startup
import './db/migrate';

const app = createApp();
const port = Number(process.env.PORT) || 3001;

console.log(`Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' });

// ── Auto-sync from Google Sheets ──
const SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS) || 60_000; // default 60s

async function autoSync() {
  try {
    const { tasks, exercises } = getSheetUrls();
    const result = await syncFromSheets(tasks, exercises);
    console.log(
      `[auto-sync] synced=${result.synced}` +
        (result.skippedNoCity.length
          ? ` skippedCities=${result.skippedNoCity.join(',')}`
          : ''),
    );
  } catch (err) {
    console.error('[auto-sync] error:', err);
  }
}

// First sync after 5s, then every SYNC_INTERVAL_MS
setTimeout(() => {
  autoSync();
  setInterval(autoSync, SYNC_INTERVAL_MS);
}, 5000);
