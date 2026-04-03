import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { db } from '../db/client';
import { cities, users } from '../db/schema';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { syncFromSheets, getTeamsByCity } from '../services/sheets-sync';
import type { JwtPayload } from '../middleware/auth';

const router = new Hono<{ Variables: { user: JwtPayload } }>();

function generatePassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < 6; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}

function transliterate(name: string): string {
  const map: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'kh',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  };
  return name
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20);
}

// Trigger sync from Google Sheets (admin only)
router.post(
  '/admin/sync-sheets',
  authMiddleware,
  adminMiddleware,
  async (c) => {
    try {
      const result = await syncFromSheets();
      return c.json(result);
    } catch (err) {
      console.error('Sheets sync error:', err);
      return c.json(
        { error: err instanceof Error ? err.message : 'Sync failed' },
        500,
      );
    }
  },
);

// Generate accounts for NEW teams only (admin only)
// Existing accounts are untouched. Downloads CSV with new passwords.
router.post(
  '/admin/generate-accounts',
  authMiddleware,
  adminMiddleware,
  (c) => {
    const teamsByCity = getTeamsByCity();
    if (teamsByCity.size === 0) {
      return c.json({ error: 'No teams found. Run sync first.' }, 400);
    }

    const allCities = db.select().from(cities).all();
    const cityNameToId = new Map<string, string>();
    for (const city of allCities) {
      cityNameToId.set(city.name, city.id);
    }

    const created: {
      city: string;
      teamName: string;
      login: string;
      password: string;
    }[] = [];
    let skipped = 0;

    for (const [cityName, teamNames] of teamsByCity) {
      const cityId = cityNameToId.get(cityName);
      if (!cityId) continue;

      for (const teamName of teamNames) {
        // Skip if account already exists
        const existing = db
          .select()
          .from(users)
          .where(and(eq(users.teamName, teamName), eq(users.cityId, cityId)))
          .get();

        if (existing) {
          if (!existing.plainPassword) {
            // Existing account without visible password — generate one
            const password = generatePassword();
            db.update(users)
              .set({
                passwordHash: bcrypt.hashSync(password, 10),
                plainPassword: password,
              })
              .where(eq(users.id, existing.id))
              .run();
            created.push({
              city: cityName,
              teamName,
              login: existing.login,
              password,
            });
          } else {
            skipped++;
          }
          continue;
        }

        const login = transliterate(teamName) || `team-${nanoid(6)}`;
        const password = generatePassword();
        const id = nanoid();

        let finalLogin = login;
        const existingLogin = db
          .select()
          .from(users)
          .where(eq(users.login, finalLogin))
          .get();
        if (existingLogin) {
          finalLogin = `${login}-${nanoid(4)}`;
        }

        db.insert(users)
          .values({
            id,
            login: finalLogin,
            passwordHash: bcrypt.hashSync(password, 10),
            plainPassword: password,
            role: 'team',
            teamName,
            cityId,
            createdAt: new Date().toISOString(),
          })
          .run();

        created.push({ city: cityName, teamName, login: finalLogin, password });
      }
    }

    created.sort(
      (a, b) =>
        a.city.localeCompare(b.city, 'ru') ||
        a.teamName.localeCompare(b.teamName, 'ru'),
    );

    return c.json({ created: created.length, skipped, accounts: created });
  },
);

// Reset password for a specific team (admin only)
router.post(
  '/admin/reset-password/:userId',
  authMiddleware,
  adminMiddleware,
  async (c) => {
    const userId = c.req.param('userId');
    const body = await c.req.json<{ password?: string }>();

    const user = db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) return c.json({ error: 'User not found' }, 404);

    const password = body.password || generatePassword();
    db.update(users)
      .set({
        passwordHash: bcrypt.hashSync(password, 10),
        plainPassword: password,
      })
      .where(eq(users.id, userId))
      .run();

    return c.json({ login: user.login, teamName: user.teamName, password });
  },
);

// Download all accounts as CSV (admin only, supports token in query for file download)
router.get('/admin/credentials.csv', async (c) => {
  // Support token via query param for direct browser download
  const token =
    c.req.header('Authorization')?.replace('Bearer ', '') ||
    c.req.query('token');

  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  // Verify token manually
  const { verifyToken } = await import('../middleware/auth');
  try {
    const payload = await verifyToken(token);
    if (payload.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }

  const allTeams = db
    .select({
      login: users.login,
      teamName: users.teamName,
      plainPassword: users.plainPassword,
      cityName: cities.name,
    })
    .from(users)
    .innerJoin(cities, eq(users.cityId, cities.id))
    .where(eq(users.role, 'team'))
    .all();

  let csv = 'Город,Команда,Логин,Пароль\n';
  allTeams
    .sort(
      (a, b) =>
        (a.cityName ?? '').localeCompare(b.cityName ?? '', 'ru') ||
        (a.teamName ?? '').localeCompare(b.teamName ?? '', 'ru'),
    )
    .forEach((t) => {
      csv += `"${t.cityName}","${t.teamName}","${t.login}","${t.plainPassword ?? ''}"\n`;
    });

  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', 'attachment; filename="credentials.csv"');
  return c.body('\uFEFF' + csv);
});

export default router;
