import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, copyFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import bcrypt from 'bcryptjs';

// 1) Spin up a DB, apply 0000..0009 only (simulate VPS state before this PR).
const scratchDir = mkdtempSync(join(tmpdir(), 'vps-sim-'));
const preMigrDir = join(scratchDir, 'migrations');
const preMetaDir = join(preMigrDir, 'meta');
mkdirSync(preMetaDir, { recursive: true });

const oldTags = [
  '0000_glorious_excalibur',
  '0001_broken_microchip',
  '0002_omniscient_molecule_man',
  '0003_mature_electro',
  '0004_wild_omega_red',
  '0005_regular_squadron_supreme',
  '0006_bored_overlord',
  '0007_square_silver_samurai',
  '0008_striped_meggan',
  '0009_nostalgic_omega_sentinel',
];
for (let i = 0; i < oldTags.length; i++) {
  copyFileSync(`./server/db/migrations/${oldTags[i]}.sql`, `${preMigrDir}/${oldTags[i]}.sql`);
  copyFileSync(
    `./server/db/migrations/meta/${String(i).padStart(4, '0')}_snapshot.json`,
    `${preMetaDir}/${String(i).padStart(4, '0')}_snapshot.json`,
  );
}

const realJournal = JSON.parse(
  readFileSync('./server/db/migrations/meta/_journal.json', 'utf8'),
);
const trimmedJournal = {
  ...realJournal,
  entries: realJournal.entries.filter((e: { idx: number }) => e.idx <= 9),
};
writeFileSync(`${preMetaDir}/_journal.json`, JSON.stringify(trimmedJournal, null, 2));

const dbPath = join(scratchDir, 'vps.db');
let sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
let db = drizzle(sqlite);

console.log('--- Phase 1: apply 0000..0009 (simulated VPS state) ---');
migrate(db, { migrationsFolder: preMigrDir });

sqlite.prepare(
  `INSERT INTO users (id, login, password_hash, role, team_name, city_id, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
).run('u-admin', 'admin', bcrypt.hashSync('admin', 10), 'admin', null, null, new Date().toISOString());

sqlite.prepare(
  `INSERT INTO cities (id, name, timezone, duration_min, timer_status, map_enabled, chat_url, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
).run('c-msk', 'Москва', 'Europe/Moscow', 240, 'pending', 1, 'https://t.me/old', new Date().toISOString());

sqlite.prepare(
  `INSERT INTO users (id, login, password_hash, role, team_name, city_id, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
).run('u-team-1', 'team1', bcrypt.hashSync('1234', 10), 'team', 'Team One', 'c-msk', new Date().toISOString());

const beforeTables = sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all() as { name: string }[];
console.log('Tables before 0010:', beforeTables.map((t) => t.name).join(', '));
console.log('Users before 0010:', sqlite.prepare(`SELECT login, role FROM users`).all());
console.log('Cities before 0010:', sqlite.prepare(`SELECT id, name FROM cities`).all());

sqlite.close();

// 2) Apply the FULL migration set (includes new 0010).
console.log('\n--- Phase 2: apply full migration set (includes 0010) ---');
sqlite = new Database(dbPath);
sqlite.pragma('foreign_keys = ON');
db = drizzle(sqlite);
migrate(db, { migrationsFolder: './server/db/migrations' });

const afterTables = sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all() as { name: string }[];
console.log('Tables after 0010:', afterTables.map((t) => t.name).filter((t) => !t.startsWith('__') && t !== 'sqlite_sequence').join(', '));

const usersCols = sqlite.prepare(`PRAGMA table_info(users)`).all() as { name: string }[];
console.log('users columns:', usersCols.map((c) => c.name).join(', '));

const citiesCols = sqlite.prepare(`PRAGMA table_info(cities)`).all() as { name: string }[];
console.log('cities columns:', citiesCols.map((c) => c.name).join(', '));

console.log('Users after 0010 (should be empty):', sqlite.prepare(`SELECT * FROM users`).all());
console.log('Cities after 0010:', sqlite.prepare(`SELECT id, name, sheet_id, sheet_range FROM cities`).all());

sqlite.close();
console.log('\n✓ VPS upgrade simulation successful');
