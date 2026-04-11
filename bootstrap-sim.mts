// Continuation: same DB, simulate server boot (applies ensureAdmin + ensureCities).
process.env.DB_PATH = './data/vps-sim-copy.db';
process.env.ADMIN_PASSWORD = 'vps-strong-pass-123';

import { copyFileSync, existsSync, unlinkSync } from 'fs';

// Copy the vps-upgrade DB to a stable location so we can load our app modules
// with env-based DB_PATH.
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import bcrypt from 'bcryptjs';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

// Rebuild a fresh "already upgraded" DB inline: apply all migrations, leave
// cities=empty (so ensureCities inserts all 22), users=empty.
if (existsSync('./data/vps-sim-copy.db')) unlinkSync('./data/vps-sim-copy.db');
const sqlite = new Database('./data/vps-sim-copy.db');
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite);
migrate(db, { migrationsFolder: './server/db/migrations' });

// Pre-seed one existing city without sheet_id to prove ensureCities upserts it.
sqlite.prepare(
  `INSERT INTO cities (id, name, timezone, duration_min, timer_status, created_at, sheet_range)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
).run('c-msk', 'Москва', 'Europe/Moscow', 240, 'pending', new Date().toISOString(), 'Таблица');

// Pre-seed the dreaded admin/admin we want gone.
sqlite.prepare(
  `INSERT INTO users (id, login, password_hash, role, created_at)
   VALUES (?, ?, ?, ?, ?)`,
).run('u-old-admin', 'admin', bcrypt.hashSync('admin', 10), 'admin', new Date().toISOString());

// Also an orphan non-admin user to prove ensureAdmin wipes them.
sqlite.prepare(
  `INSERT INTO users (id, login, password_hash, role, created_at)
   VALUES (?, ?, ?, ?, ?)`,
).run('u-orphan', 'orphan', bcrypt.hashSync('x', 10), 'admin', new Date().toISOString());

sqlite.close();

console.log('--- Before bootstrap ---');
{
  const s = new Database('./data/vps-sim-copy.db');
  console.log('Users:', s.prepare(`SELECT login FROM users`).all());
  console.log('Cities:', s.prepare(`SELECT name, sheet_id FROM cities`).all());
  s.close();
}

// Now run bootstrap using the app's own modules.
const { ensureAdmin, ensureCities } = await import('./server/db/bootstrap.ts');
ensureAdmin();
ensureCities();

console.log('\n--- After bootstrap ---');
{
  const s = new Database('./data/vps-sim-copy.db');
  const users = s.prepare(`SELECT login, role FROM users`).all() as { login: string; role: string }[];
  console.log('Users:', users);

  // Verify old password no longer works, new one does
  const u = s.prepare(`SELECT password_hash FROM users WHERE login = 'admin'`).get() as { password_hash: string } | undefined;
  if (u) {
    console.log('  admin/admin still valid?', bcrypt.compareSync('admin', u.password_hash));
    console.log('  admin/vps-strong-pass-123 valid?', bcrypt.compareSync('vps-strong-pass-123', u.password_hash));
  }

  const cities = s.prepare(`SELECT name, sheet_id FROM cities ORDER BY name`).all() as { name: string; sheet_id: string | null }[];
  console.log('Cities count:', cities.length);
  const moscow = cities.find((c) => c.name === 'Москва');
  console.log('  Москва sheet_id backfilled?', moscow?.sheet_id ? 'yes' : 'NO');
  const minsk = cities.find((c) => c.name === 'Минск');
  console.log('  Минск created?', minsk?.sheet_id ? 'yes' : 'NO');
  s.close();
}

unlinkSync('./data/vps-sim-copy.db');
if (existsSync('./data/vps-sim-copy.db-wal')) unlinkSync('./data/vps-sim-copy.db-wal');
if (existsSync('./data/vps-sim-copy.db-shm')) unlinkSync('./data/vps-sim-copy.db-shm');
console.log('\n✓ Bootstrap simulation successful');
