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
const moscowId = nanoid();
const kazanId = nanoid();

db.insert(cities)
  .values([
    {
      id: moscowId,
      name: 'Москва',
      timezone: 'Europe/Moscow',
      durationMin: 240,
      timerStatus: 'pending',
      mapEnabled: true,
      createdAt: now,
    },
    {
      id: kazanId,
      name: 'Казань',
      timezone: 'Europe/Moscow',
      durationMin: 240,
      timerStatus: 'pending',
      mapEnabled: false,
      createdAt: now,
    },
  ])
  .run();

// ── Teams ──
const moscowTeams = [
  { login: 'team-msk-1', teamName: 'CodeMasters', pw: '1234' },
  { login: 'team-msk-2', teamName: 'AlgoWarriors', pw: '1234' },
  { login: 'team-msk-3', teamName: 'ByteBusters', pw: '1234' },
  { login: 'team-msk-4', teamName: 'StackOverflow', pw: '1234' },
  { login: 'team-msk-5', teamName: 'Team Alpha', pw: '1234' },
];

const kazanTeams = [
  { login: 'team-kzn-1', teamName: 'KazanCoders', pw: '1234' },
  { login: 'team-kzn-2', teamName: 'TatarDevs', pw: '1234' },
  { login: 'team-kzn-3', teamName: 'IT-Kazan', pw: '1234' },
];

const teamIds: Record<string, string> = {};

for (const t of [...moscowTeams, ...kazanTeams]) {
  const id = nanoid();
  const cityId = moscowTeams.includes(t) ? moscowId : kazanId;
  teamIds[t.login] = id;
  db.insert(users)
    .values({
      id,
      login: t.login,
      passwordHash: hash(t.pw),
      role: 'team',
      teamName: t.teamName,
      cityId,
      createdAt: now,
    })
    .run();
}

// Demo user for quick testing
const demoId = nanoid();
teamIds['demo'] = demoId;
db.insert(users)
  .values({
    id: demoId,
    login: 'demo',
    passwordHash: hash('demo'),
    role: 'team',
    teamName: 'Team Alpha',
    cityId: moscowId,
    createdAt: now,
  })
  .run();

// ── Zones (Moscow — with map) ──
const moscowZones = [
  {
    name: 'Зона 1: Алгоритмы ↔ Отжимания',
    type: 'task' as const,
    difficulty: 'easy' as const,
    x: 200,
    y: 100,
    desc: 'Решите задачу на поиск и отсортируйте массив, затем выполните 20 отжиманий',
  },
  {
    name: 'Зона 2: Структуры данных ↔ Приседания',
    type: 'task' as const,
    difficulty: 'easy' as const,
    x: 500,
    y: 80,
    desc: 'Реализуйте стек или очередь, затем сделайте 30 приседаний',
  },
  {
    name: 'Зона 3: Графы ↔ Планка',
    type: 'task' as const,
    difficulty: 'medium' as const,
    x: 800,
    y: 150,
    desc: 'Найдите кратчайший путь в графе и удерживайте планку 60 секунд',
  },
  {
    name: 'Зона 4: Динамика ↔ Прыжки',
    type: 'task' as const,
    difficulty: 'hard' as const,
    x: 950,
    y: 350,
    desc: 'Решите задачу DP и выполните 50 прыжков',
  },
  {
    name: 'Зона 5: Строки ↔ Берпи',
    type: 'task' as const,
    difficulty: 'medium' as const,
    x: 850,
    y: 550,
    desc: 'Обработайте строки и сделайте 15 берпи',
  },
  {
    name: 'Зона 6: Деревья ↔ Выпады',
    type: 'task' as const,
    difficulty: 'hard' as const,
    x: 550,
    y: 600,
    desc: 'Обойдите дерево и выполните 20 выпадов на каждую ногу',
  },
  {
    name: 'Зона 7: Математика ↔ Скручивания',
    type: 'task' as const,
    difficulty: 'medium' as const,
    x: 250,
    y: 550,
    desc: 'Решите математическую задачу и сделайте 40 скручиваний',
  },
  {
    name: 'Зона 8: Greedy ↔ Бег',
    type: 'task' as const,
    difficulty: 'easy' as const,
    x: 50,
    y: 400,
    desc: 'Примените жадный алгоритм и пробегите 400м',
  },
  {
    name: 'Зона 9: Комбинаторика ↔ Растяжка',
    type: 'task' as const,
    difficulty: 'medium' as const,
    x: 100,
    y: 250,
    desc: 'Посчитайте комбинации и сделайте растяжку 5 минут',
  },
  {
    name: 'Зона 10: Оптимизация ↔ Кардио',
    type: 'task' as const,
    difficulty: 'hard' as const,
    x: 400,
    y: 350,
    desc: 'Оптимизируйте решение и выполните кардио-сет',
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
      positionX: z.x,
      positionY: z.y,
      sizeWidth: z.w ?? 140,
      sizeHeight: z.h ?? 120,
      sortOrder: i,
      createdAt: now,
    })
    .run();
}

// ── Zones (Kazan — no map, just tasks) ──
const kazanZones = [
  {
    name: 'Задача A: Сортировка ↔ Планка',
    type: 'task' as const,
    difficulty: 'easy' as const,
    desc: 'Реализуйте быструю сортировку и удерживайте планку 45 секунд',
  },
  {
    name: 'Задача B: BFS ↔ Скакалка',
    type: 'task' as const,
    difficulty: 'medium' as const,
    desc: 'Обход графа в ширину + 100 прыжков на скакалке',
  },
  {
    name: 'Задача C: DP ↔ Берпи',
    type: 'task' as const,
    difficulty: 'hard' as const,
    desc: 'Динамическое программирование + 10 берпи',
  },
  {
    name: 'Задача D: Строки ↔ Отжимания',
    type: 'task' as const,
    difficulty: 'medium' as const,
    desc: 'Обработка строк + 25 отжиманий',
  },
  {
    name: 'Задача E: Математика ↔ Приседания',
    type: 'task' as const,
    difficulty: 'easy' as const,
    desc: 'Математическая задача + 30 приседаний',
  },
];

for (let i = 0; i < kazanZones.length; i++) {
  const z = kazanZones[i];
  db.insert(zones)
    .values({
      id: nanoid(),
      cityId: kazanId,
      name: z.name,
      type: z.type,
      description: z.desc,
      difficulty: z.difficulty,
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
      'Добро пожаловать на Code Gym × T-Bank! Контест продлится 4 часа. Желаем удачи всем участникам!',
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
    message: 'Добро пожаловать на Code Gym × T-Bank в Казани! Удачи!',
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

// ── Leaderboard mock data ──
const scores = [
  { login: 'team-msk-1', score: 850, penalty: 45, solved: 8 },
  { login: 'team-msk-2', score: 720, penalty: 60, solved: 7 },
  { login: 'team-msk-3', score: 680, penalty: 55, solved: 7 },
  { login: 'team-msk-4', score: 620, penalty: 70, solved: 6 },
  { login: 'demo', score: 580, penalty: 80, solved: 6 },
  { login: 'team-msk-5', score: 540, penalty: 65, solved: 5 },
  { login: 'team-kzn-1', score: 600, penalty: 50, solved: 5 },
  { login: 'team-kzn-2', score: 450, penalty: 40, solved: 4 },
  { login: 'team-kzn-3', score: 300, penalty: 30, solved: 3 },
];

for (const s of scores) {
  const userId = teamIds[s.login];
  if (!userId) continue;
  // Determine city
  const user = db.select().from(users).where(eq(users.id, userId)).get()!;
  db.insert(leaderboardCache)
    .values({
      id: nanoid(),
      cityId: user.cityId!,
      userId,
      score: s.score,
      penalty: s.penalty,
      solved: s.solved,
      updatedAt: now,
    })
    .run();
}

console.log('Seed complete!');
console.log('  Admin: admin / admin');
console.log('  Demo:  demo / demo (Moscow)');
console.log('  Teams: team-msk-1..5 / 1234, team-kzn-1..3 / 1234');
console.log(`  Moscow ID: ${moscowId}`);
console.log(`  Kazan ID:  ${kazanId}`);
