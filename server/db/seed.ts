import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, sqlite } from './client';
import {
  cities,
  users,
  zones,
  announcements,
  leaderboardCache,
} from './schema';

// Run migrations first
import './migrate';

console.log('Seeding database...');

// Clear existing data
sqlite.exec('DELETE FROM leaderboard_cache');
sqlite.exec('DELETE FROM team_progress');
sqlite.exec('DELETE FROM announcements');
sqlite.exec('DELETE FROM zones');
sqlite.exec('DELETE FROM users');
sqlite.exec('DELETE FROM cities');

const hash = (pw: string) => bcrypt.hashSync(pw, 10);
const now = new Date().toISOString();

// ── Admin ──
const adminId = nanoid();
db.insert(users)
  .values({
    id: adminId,
    login: 'admin',
    passwordHash: hash('admin'),
    role: 'admin',
    teamName: null,
    cityId: null,
    createdAt: now,
  })
  .run();

// ── Cities ──

// April 12 cities
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

// April 11 cities
const april11Cities = [{ name: 'Минск', tz: 'Europe/Minsk' }];

const cityIds: Record<string, string> = {};

for (const c of april12Cities) {
  const id = nanoid();
  cityIds[c.name] = id;
  db.insert(cities)
    .values({
      id,
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
  const id = nanoid();
  cityIds[c.name] = id;
  db.insert(cities)
    .values({
      id,
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

// ── Teams for ALL cities ──
// Short city codes for login generation
const cityCodes: Record<string, string> = {
  Москва: 'msk',
  'Санкт-Петербург': 'spb',
  Екатеринбург: 'ekb',
  Казань: 'kzn',
  Иннополис: 'inn',
  'Нижний Новгород': 'nno',
  Новосибирск: 'nsk',
  Самара: 'sam',
  Краснодар: 'krd',
  Уфа: 'ufa',
  Томск: 'tom',
  Омск: 'omk',
  Рязань: 'rzn',
  Ростов: 'rst',
  Ижевск: 'izh',
  Пермь: 'prm',
  Саратов: 'sar',
  Челябинск: 'chb',
  Сочи: 'soc',
  Владивосток: 'vdk',
  Красноярск: 'krs',
  Минск: 'mnk',
};

const teamIds: Record<string, string> = {};

const allCityNames = [...april12Cities, ...april11Cities].map((c) => c.name);
for (const cityName of allCityNames) {
  const cid = cityIds[cityName];
  const code = cityCodes[cityName] || cityName.slice(0, 3).toLowerCase();

  for (let i = 1; i <= 3; i++) {
    const login = `team-${code}-${i}`;
    const id = nanoid();
    teamIds[login] = id;
    db.insert(users)
      .values({
        id,
        login,
        passwordHash: hash('1234'),
        role: 'team',
        teamName: `${cityName} Team ${i}`,
        cityId: cid,
        createdAt: now,
      })
      .run();
  }
}

// Demo user for quick testing (Moscow)
const demoId = nanoid();
teamIds['demo'] = demoId;
db.insert(users)
  .values({
    id: demoId,
    login: 'demo',
    passwordHash: hash('demo'),
    role: 'team',
    teamName: 'Demo Team',
    cityId: cityIds['Москва'],
    createdAt: now,
  })
  .run();

const moscowId = cityIds['Москва'];
const kazanId = cityIds['Казань'];

// ── Zones (Moscow — 9 tasks A-I + utility zones) ──
const moscowZones: {
  name: string;
  type: 'task' | 'side-quest' | 'photo' | 'water' | 'snack';
  difficulty?: 'easy' | 'medium' | 'hard';
  x: number;
  y: number;
  desc: string;
  letter?: string;
  exercise?: string;
  w?: number;
  h?: number;
}[] = [
  {
    name: 'Задача A: Алгоритмы',
    type: 'task',
    difficulty: 'easy',
    x: 200,
    y: 100,
    desc: 'Поиск и сортировка массива',
    letter: 'A',
    exercise: '20 отжиманий',
  },
  {
    name: 'Задача B: Структуры данных',
    type: 'task',
    difficulty: 'easy',
    x: 500,
    y: 80,
    desc: 'Реализуйте стек или очередь',
    letter: 'B',
    exercise: '30 приседаний',
  },
  {
    name: 'Задача C: Графы',
    type: 'task',
    difficulty: 'medium',
    x: 800,
    y: 150,
    desc: 'Кратчайший путь в графе',
    letter: 'C',
    exercise: 'Планка 60 секунд',
  },
  {
    name: 'Задача D: Динамика',
    type: 'task',
    difficulty: 'hard',
    x: 950,
    y: 350,
    desc: 'Задача на динамическое программирование',
    letter: 'D',
    exercise: '50 прыжков',
  },
  {
    name: 'Задача E: Строки',
    type: 'task',
    difficulty: 'medium',
    x: 850,
    y: 550,
    desc: 'Обработка строк и подстрок',
    letter: 'E',
    exercise: '15 берпи',
  },
  {
    name: 'Задача F: Деревья',
    type: 'task',
    difficulty: 'hard',
    x: 550,
    y: 600,
    desc: 'Обход и модификация дерева',
    letter: 'F',
    exercise: '20 выпадов на каждую ногу',
  },
  {
    name: 'Задача G: Математика',
    type: 'task',
    difficulty: 'medium',
    x: 250,
    y: 550,
    desc: 'Математическая задача',
    letter: 'G',
    exercise: '40 скручиваний',
  },
  {
    name: 'Задача H: Greedy',
    type: 'task',
    difficulty: 'easy',
    x: 50,
    y: 400,
    desc: 'Жадный алгоритм',
    letter: 'H',
    exercise: 'Бег 400м',
  },
  {
    name: 'Задача I: Комбинаторика',
    type: 'task',
    difficulty: 'medium',
    x: 100,
    y: 250,
    desc: 'Комбинаторная задача',
    letter: 'I',
    exercise: 'Растяжка 5 минут',
  },
  {
    name: 'Side Quest: Бонус',
    type: 'side-quest' as const,
    difficulty: undefined,
    x: 600,
    y: 300,
    desc: 'Дополнительное задание для получения бонусных баллов',
    w: 120,
    h: 100,
  },
  {
    name: 'Фотозона',
    type: 'photo' as const,
    difficulty: undefined,
    x: 450,
    y: 150,
    desc: 'Сделайте креативное фото команды',
    w: 100,
    h: 80,
  },
  {
    name: 'Вода',
    type: 'water' as const,
    difficulty: undefined,
    x: 700,
    y: 400,
    desc: 'Зона отдыха с водой',
    w: 80,
    h: 80,
  },
  {
    name: 'Питание',
    type: 'snack' as const,
    difficulty: undefined,
    x: 300,
    y: 450,
    desc: 'Легкие закуски и напитки',
    w: 80,
    h: 80,
  },
];

for (let i = 0; i < moscowZones.length; i++) {
  const z = moscowZones[i];
  db.insert(zones)
    .values({
      id: nanoid(),
      cityId: moscowId,
      name: z.name,
      type: z.type,
      description: z.desc,
      difficulty: z.difficulty ?? null,
      problemLetter: z.letter ?? null,
      exercise: z.exercise ?? null,
      positionX: z.x,
      positionY: z.y,
      sizeWidth: z.w ?? 140,
      sizeHeight: z.h ?? 120,
      sortOrder: i,
      createdAt: now,
    })
    .run();
}

// ── Zones (Kazan — no map, 9 tasks A-I with exercises) ──
const kazanZones = [
  {
    letter: 'A',
    name: 'Сортировка',
    difficulty: 'easy' as const,
    desc: 'Реализуйте быструю сортировку',
    exercise: 'Планка 45 секунд',
  },
  {
    letter: 'B',
    name: 'BFS',
    difficulty: 'easy' as const,
    desc: 'Обход графа в ширину',
    exercise: '100 прыжков на скакалке',
  },
  {
    letter: 'C',
    name: 'Динамическое программирование',
    difficulty: 'medium' as const,
    desc: 'Задача на DP',
    exercise: '10 берпи',
  },
  {
    letter: 'D',
    name: 'Строки',
    difficulty: 'medium' as const,
    desc: 'Обработка строк и подстрок',
    exercise: '25 отжиманий',
  },
  {
    letter: 'E',
    name: 'Математика',
    difficulty: 'medium' as const,
    desc: 'Математическая задача',
    exercise: '30 приседаний',
  },
  {
    letter: 'F',
    name: 'Графы',
    difficulty: 'hard' as const,
    desc: 'Кратчайшие пути в графе',
    exercise: 'Бег 400м',
  },
  {
    letter: 'G',
    name: 'Деревья',
    difficulty: 'hard' as const,
    desc: 'Обход и модификация дерева',
    exercise: '20 выпадов на каждую ногу',
  },
  {
    letter: 'H',
    name: 'Комбинаторика',
    difficulty: 'hard' as const,
    desc: 'Комбинаторная задача',
    exercise: '40 скручиваний',
  },
  {
    letter: 'I',
    name: 'Оптимизация',
    difficulty: 'hard' as const,
    desc: 'Оптимизируйте решение',
    exercise: 'Кардио-сет 5 минут',
  },
];

for (let i = 0; i < kazanZones.length; i++) {
  const z = kazanZones[i];
  db.insert(zones)
    .values({
      id: nanoid(),
      cityId: kazanId,
      name: `Задача ${z.letter}: ${z.name}`,
      type: 'task',
      description: z.desc,
      difficulty: z.difficulty,
      problemLetter: z.letter,
      exercise: z.exercise,
      positionX: 0,
      positionY: 0,
      sizeWidth: 140,
      sizeHeight: 120,
      sortOrder: i,
      createdAt: now,
    })
    .run();
}

// ── Announcements ──
const announceData = [
  {
    cityId: moscowId,
    title: 'Контест начался!',
    message:
      'Добро пожаловать на Код спорта! Контест продлится 4 часа. Желаем удачи всем участникам!',
    important: true,
  },
  {
    cityId: moscowId,
    title: 'WiFi информация',
    message: 'Сеть: CodeGym_Contest, Пароль: tbank2026',
    important: false,
  },
  {
    cityId: kazanId,
    title: 'Контест начался!',
    message: 'Добро пожаловать на Код спорта в Казани! Удачи!',
    important: true,
  },
];

for (const a of announceData) {
  db.insert(announcements)
    .values({
      id: nanoid(),
      cityId: a.cityId,
      title: a.title,
      message: a.message,
      important: a.important,
      createdAt: now,
    })
    .run();
}

// ── Leaderboard mock data (9 problems A-I, 100 pts each) ──
const PROBLEMS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

function genProblems(
  solvedCount: number,
): Record<
  string,
  { score: number; penalty: number; attempts: number; solved: boolean }
> {
  const result: Record<
    string,
    { score: number; penalty: number; attempts: number; solved: boolean }
  > = {};
  // Solve first N problems (easier ones first)
  for (let i = 0; i < PROBLEMS.length; i++) {
    const p = PROBLEMS[i];
    if (i < solvedCount) {
      const attempts = 1 + Math.floor(Math.random() * 3); // 1-3 attempts
      const penalty = (attempts - 1) * 20; // 20 min per wrong attempt
      result[p] = { score: 100, penalty, attempts, solved: true };
    } else if (Math.random() < 0.3) {
      // Some unsolved attempts
      const attempts = 1 + Math.floor(Math.random() * 2);
      result[p] = { score: 0, penalty: 0, attempts, solved: false };
    }
  }
  return result;
}

function computeFromProblems(
  probs: Record<
    string,
    { score: number; penalty: number; attempts: number; solved: boolean }
  >,
) {
  let score = 0,
    penalty = 0,
    solved = 0;
  for (const p of Object.values(probs)) {
    if (p.solved) {
      score += p.score;
      penalty += p.penalty;
      solved++;
    }
  }
  return { score, penalty, solved };
}

const teamScores: { login: string; solvedCount: number }[] = [
  { login: 'team-msk-1', solvedCount: 8 },
  { login: 'team-msk-2', solvedCount: 7 },
  { login: 'team-msk-3', solvedCount: 5 },
  { login: 'demo', solvedCount: 4 },
  { login: 'team-kzn-1', solvedCount: 6 },
  { login: 'team-kzn-2', solvedCount: 3 },
];

for (const s of teamScores) {
  const userId = teamIds[s.login];
  if (!userId) continue;
  const user = db.select().from(users).where(eq(users.id, userId)).get()!;
  const problems = genProblems(s.solvedCount);
  const { score, penalty, solved } = computeFromProblems(problems);
  db.insert(leaderboardCache)
    .values({
      id: nanoid(),
      cityId: user.cityId!,
      userId,
      score,
      penalty,
      solved,
      problems: JSON.stringify(problems),
      updatedAt: now,
    })
    .run();
}

console.log('Seed complete!');
console.log('  Admin:  admin / admin');
console.log('  Demo:   demo / demo (Москва)');
console.log('  Teams:  team-{city}-{1..3} / 1234');
console.log('  Cities:', allCityNames.length);
console.log(
  '  Codes:',
  Object.entries(cityCodes)
    .map(([k, v]) => `${v}=${k}`)
    .join(', '),
);
