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
  contestDate: text('contest_date'),
  sheetId: text('sheet_id'),
  sheetRange: text('sheet_range').notNull().default('Таблица'),
  // JSON array of 9 exercise display names; null falls back to "Упражнение N".
  exerciseNames: text('exercise_names'),
  createdAt: text('created_at').notNull(),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  login: text('login').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin'] })
    .notNull()
    .default('admin'),
  createdAt: text('created_at').notNull(),
});
