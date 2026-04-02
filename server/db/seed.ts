import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { db, sqlite } from './client';
import { cities, users } from './schema';

// Run migrations first
import './migrate';

console.log('Seeding database...');

// Clear existing data (disable FK checks to avoid ordering issues)
sqlite.exec('PRAGMA foreign_keys = OFF');
sqlite.exec('DELETE FROM leaderboard_cache');
sqlite.exec('DELETE FROM team_progress');
sqlite.exec('DELETE FROM announcement_reads');
sqlite.exec('DELETE FROM announcements');
sqlite.exec('DELETE FROM zones');
sqlite.exec('DELETE FROM users');
sqlite.exec('DELETE FROM cities');
sqlite.exec('PRAGMA foreign_keys = ON');

const hash = (pw: string) => bcrypt.hashSync(pw, 10);
const now = new Date().toISOString();

// ── Admin ──
db.insert(users)
  .values({
    id: nanoid(),
    login: 'admin',
    passwordHash: hash('admin'),
    role: 'admin',
    teamName: null,
    cityId: null,
    createdAt: now,
  })
  .run();

// ── Cities ──

const april12Cities = [
  { name: 'Москва', tz: 'Europe/Moscow' },
  { name: 'Санкт-Петербург', tz: 'Europe/Moscow' },
  { name: 'Екатеринбург', tz: 'Asia/Yekaterinburg' },
  { name: 'Казань', tz: 'Europe/Moscow' },
  { name: 'Иннополис', tz: 'Europe/Moscow' },
  { name: 'Нижний Новгород', tz: 'Europe/Moscow' },
  { name: 'Новосибирск', tz: 'Asia/Novosibirsk' },
  { name: 'Самара', tz: 'Europe/Samara' },
  { name: 'Краснодар', tz: 'Europe/Moscow' },
  { name: 'Уфа', tz: 'Asia/Yekaterinburg' },
  { name: 'Томск', tz: 'Asia/Tomsk' },
  { name: 'Омск', tz: 'Asia/Omsk' },
  { name: 'Рязань', tz: 'Europe/Moscow' },
  { name: 'Ростов', tz: 'Europe/Moscow' },
  { name: 'Ижевск', tz: 'Europe/Samara' },
  { name: 'Пермь', tz: 'Asia/Yekaterinburg' },
  { name: 'Саратов', tz: 'Europe/Saratov' },
  { name: 'Челябинск', tz: 'Asia/Yekaterinburg' },
  { name: 'Сочи', tz: 'Europe/Moscow' },
  { name: 'Владивосток', tz: 'Asia/Vladivostok' },
  { name: 'Красноярск', tz: 'Asia/Krasnoyarsk' },
];

const april11Cities = [{ name: 'Минск', tz: 'Europe/Minsk' }];

for (const c of april12Cities) {
  db.insert(cities)
    .values({
      id: nanoid(),
      name: c.name,
      timezone: c.tz,
      durationMin: 240,
      timerStatus: 'pending',
      mapEnabled: false,
      contestDate: '2025-04-12',
      createdAt: now,
    })
    .run();
}

for (const c of april11Cities) {
  db.insert(cities)
    .values({
      id: nanoid(),
      name: c.name,
      timezone: c.tz,
      durationMin: 240,
      timerStatus: 'pending',
      mapEnabled: false,
      contestDate: '2025-04-11',
      createdAt: now,
    })
    .run();
}

const totalCities = april12Cities.length + april11Cities.length;

console.log('Seed complete!');
console.log('  Admin:  admin / admin');
console.log(`  Cities: ${totalCities}`);
console.log('  Teams & leaderboard: will be populated via Google Sheets sync');
