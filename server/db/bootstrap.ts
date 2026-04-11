import { eq, ne } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { db } from './client';
import { cities, users } from './schema';

const CREDENTIALS_PATH = './secrets/admin-credentials.txt';

interface CitySeed {
  name: string;
  tz: string;
  sheetId: string;
}

// Canonical city seed list. Used by both bootstrap-on-boot and the reset seed.
export const CITY_SEEDS: CitySeed[] = [
  {
    name: 'Минск',
    tz: 'Europe/Minsk',
    sheetId: '1HQrcJhyK0CpTCyqBf5mpQpN8dRbc_pmJdYeHUXmuWcs',
  },
  {
    name: 'Москва',
    tz: 'Europe/Moscow',
    sheetId: '1N2vFGG2--i7slFKkppxfQtvxRnF43JSsnymIYAyksRk',
  },
  {
    name: 'Санкт-Петербург',
    tz: 'Europe/Moscow',
    sheetId: '1CTP7PulaQQIH-cCbRXUXiO53y1h0rD_LKTbbPEd5p6M',
  },
  {
    name: 'Екатеринбург',
    tz: 'Asia/Yekaterinburg',
    sheetId: '1rrj5RBV-JEjW0QBGsDR0efmhIOoU5C6Li2f41Y6vQJ0',
  },
  {
    name: 'Казань',
    tz: 'Europe/Moscow',
    sheetId: '11EiluDl4mg8EEOTtSD76xjIvRmYHwi93iqXwGVu58vY',
  },
  {
    name: 'Новосибирск',
    tz: 'Asia/Novosibirsk',
    sheetId: '18op03OJ5w_sEEbeS7IdOj0byIsvmbcc-xm_7NYZ-3IQ',
  },
  {
    name: 'Самара',
    tz: 'Europe/Samara',
    sheetId: '1igOWnBAuMHeETBJRWW45DPhG9OoCWSfta6gynH8bPJM',
  },
  {
    name: 'Краснодар',
    tz: 'Europe/Moscow',
    sheetId: '1gdEh3SGHpVmHSxq2CCEyMNMjezoeOcHTJb7vJOVaYi0',
  },
  {
    name: 'Уфа',
    tz: 'Asia/Yekaterinburg',
    sheetId: '1ArDAr_mF-7u5mbfxNcbjt1td7uFT57alFVAZpEn8WGg',
  },
  {
    name: 'Томск',
    tz: 'Asia/Tomsk',
    sheetId: '1elWd7dJYPz48dEp6Io2JSbJC6Vi0xHnVpXkCz1_ruF8',
  },
  {
    name: 'Омск',
    tz: 'Asia/Omsk',
    sheetId: '1NCsGUUSZAYn-tHMBuMHggJhwxokkHk3EFY-1_ew_2Yk',
  },
  {
    name: 'Иннополис',
    tz: 'Europe/Moscow',
    sheetId: '1_iaHZkiZ8_LB1fLFGSAeUm-Mge2aKLjf8EQve7DFnhw',
  },
  {
    name: 'Рязань',
    tz: 'Europe/Moscow',
    sheetId: '1cqfIYwy8OoQkJTnsQ_8MAD8U_47Eb9ckQT9q_08eV5A',
  },
  {
    name: 'Ижевск',
    tz: 'Europe/Samara',
    sheetId: '1-QAXl23E7fvULKnDxa_4PzDKuUDL_eglotahMOj7cio',
  },
  {
    name: 'Пермь',
    tz: 'Asia/Yekaterinburg',
    sheetId: '1LmqzPne6VFzFl39A9PWIkCnau2LFoFNF9jzS4c2zGcs',
  },
  {
    name: 'Саратов',
    tz: 'Europe/Saratov',
    sheetId: '1mW8y9nqhoMZblG5CREUCoQYy_RhGvcWBGN1Nl0lsWmE',
  },
  {
    name: 'Челябинск',
    tz: 'Asia/Yekaterinburg',
    sheetId: '1GnOC5ghbqaZMc08JF7eRtMam6thxactbWH1I6OSZz-8',
  },
  {
    name: 'Сочи',
    tz: 'Europe/Moscow',
    sheetId: '1ARybBf7RQ6djw-a_mDYnvA_4bBRUOL6mD5ENy6CJLXQ',
  },
  {
    name: 'Владивосток',
    tz: 'Asia/Vladivostok',
    sheetId: '1DuHMtvlQofK0QKwmhRw6UhQbT0Q0vjZVE1gdpmwdRl0',
  },
  {
    name: 'Красноярск',
    tz: 'Asia/Krasnoyarsk',
    sheetId: '1f4R-75DZoIjrvG0W2nWekCiFDhgt2Z5nxg-nnz7a2lc',
  },
  {
    name: 'Воронеж',
    tz: 'Europe/Moscow',
    sheetId: '1ryBtkPBw3x0PAseeHOimv5rgsDeoO935R9BG1NL_nTU',
  },
  {
    name: 'Нижний Новгород',
    tz: 'Europe/Moscow',
    sheetId: '1h-kPGNo4bJlUfsXdZ71pQIKuVU4QUA2H0-059iabcjM',
  },
];

/**
 * Guarantees exactly one admin account exists, matching `ADMIN_LOGIN` /
 * `ADMIN_PASSWORD` from env. If `ADMIN_PASSWORD` is not set we generate a
 * strong random one, print it and write it to `./secrets/admin-credentials.txt`
 * — but ONLY on a clean install where no admin exists yet. On subsequent boots
 * with a password-less env we keep the existing hash in place so we don't
 * silently lock the operator out.
 *
 * Any non-target users are deleted — the leaderboard-only site has a single
 * role, and leftover team/trainer rows from earlier versions must not linger.
 */
export function ensureAdmin(): void {
  const adminLogin = process.env.ADMIN_LOGIN ?? 'admin';
  const envPassword = process.env.ADMIN_PASSWORD ?? '';
  const now = new Date().toISOString();

  // Wipe any user that is not our target login. Covers leftover 'admin'/'admin'
  // and any stray accounts from a previous version of the site.
  db.delete(users).where(ne(users.login, adminLogin)).run();

  const existing = db
    .select()
    .from(users)
    .where(eq(users.login, adminLogin))
    .get();

  if (envPassword) {
    const passwordHash = bcrypt.hashSync(envPassword, 10);
    if (existing) {
      db.update(users)
        .set({ passwordHash, role: 'admin' })
        .where(eq(users.id, existing.id))
        .run();
    } else {
      db.insert(users)
        .values({
          id: nanoid(),
          login: adminLogin,
          passwordHash,
          role: 'admin',
          createdAt: now,
        })
        .run();
    }
    return;
  }

  if (existing) {
    // No env password, but an admin already exists — leave the existing hash
    // alone so the operator can still log in.
    return;
  }

  // Clean install with no env password: generate a strong one, persist it.
  const generated = nanoid(20);
  mkdirSync(dirname(CREDENTIALS_PATH), { recursive: true });
  writeFileSync(
    CREDENTIALS_PATH,
    `login: ${adminLogin}\npassword: ${generated}\ngenerated_at: ${now}\n`,
    { mode: 0o600 },
  );
  console.warn(
    `[bootstrap] ADMIN_PASSWORD not set. Generated admin password written to ${CREDENTIALS_PATH}`,
  );
  console.warn(`[bootstrap]   login:    ${adminLogin}`);
  console.warn(`[bootstrap]   password: ${generated}`);

  db.insert(users)
    .values({
      id: nanoid(),
      login: adminLogin,
      passwordHash: bcrypt.hashSync(generated, 10),
      role: 'admin',
      createdAt: now,
    })
    .run();
}

/**
 * Upsert cities by name. Existing rows get sheetId/sheetRange filled in if
 * they were empty; missing rows are inserted. We never touch timer state,
 * contestDate or exerciseNames — those are operator-managed.
 */
export function ensureCities(): void {
  const existing = db.select().from(cities).all();
  const byName = new Map(existing.map((c) => [c.name, c]));
  const now = new Date().toISOString();

  for (const seed of CITY_SEEDS) {
    const current = byName.get(seed.name);
    if (!current) {
      db.insert(cities)
        .values({
          id: nanoid(),
          name: seed.name,
          timezone: seed.tz,
          durationMin: 240,
          timerStatus: 'pending',
          sheetId: seed.sheetId,
          sheetRange: 'Таблица',
          exerciseNames: null,
          contestDate: null,
          createdAt: now,
        })
        .run();
      continue;
    }
    const patch: Partial<typeof cities.$inferInsert> = {};
    if (!current.sheetId) patch.sheetId = seed.sheetId;
    if (current.timezone !== seed.tz) patch.timezone = seed.tz;
    if (Object.keys(patch).length > 0) {
      db.update(cities).set(patch).where(eq(cities.id, current.id)).run();
    }
  }
}
