import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const cities = sqliteTable('cities', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  timezone: text('timezone').notNull(),
  startTime: text('start_time'),
  durationMin: integer('duration_min').notNull().default(240),
  timerStatus: text('timer_status', {
    enum: ['pending', 'running', 'paused', 'finished'],
  })
    .notNull()
    .default('pending'),
  pausedAt: integer('paused_at'),
  mapEnabled: integer('map_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  contestDate: text('contest_date'),
  createdAt: text('created_at').notNull(),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  login: text('login').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'team'] }).notNull(),
  teamName: text('team_name'),
  cityId: text('city_id').references(() => cities.id),
  createdAt: text('created_at').notNull(),
});

export const zones = sqliteTable('zones', {
  id: text('id').primaryKey(),
  cityId: text('city_id')
    .notNull()
    .references(() => cities.id),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['task', 'side-quest', 'photo', 'water', 'snack'],
  }).notNull(),
  description: text('description'),
  difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard'] }),
  positionX: integer('position_x').default(0),
  positionY: integer('position_y').default(0),
  sizeWidth: integer('size_width').default(140),
  sizeHeight: integer('size_height').default(120),
  ejudgeProblemId: text('ejudge_problem_id'),
  problemLetter: text('problem_letter'),
  exercise: text('exercise'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const announcements = sqliteTable('announcements', {
  id: text('id').primaryKey(),
  cityId: text('city_id')
    .notNull()
    .references(() => cities.id),
  title: text('title').notNull(),
  message: text('message').notNull(),
  important: integer('important', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

export const announcementReads = sqliteTable('announcement_reads', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  announcementId: text('announcement_id')
    .notNull()
    .references(() => announcements.id),
  readAt: text('read_at').notNull(),
});

export const teamProgress = sqliteTable('team_progress', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  zoneId: text('zone_id')
    .notNull()
    .references(() => zones.id),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  completedAt: text('completed_at'),
});

export const leaderboardCache = sqliteTable('leaderboard_cache', {
  id: text('id').primaryKey(),
  cityId: text('city_id')
    .notNull()
    .references(() => cities.id),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  score: integer('score').notNull().default(0),
  // JSON: per-problem results, e.g. {"A":{"score":100,"penalty":0,"attempts":1},...}
  problems: text('problems'),
  penalty: integer('penalty').notNull().default(0),
  solved: integer('solved').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});
