import { z } from 'zod';

// ── Auth ──

export const loginSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

// ── City ──

export const createCitySchema = z.object({
  name: z.string().min(1),
  timezone: z.string().min(1),
  startTime: z.string().optional(),
  durationMin: z.number().int().positive().default(240),
  mapEnabled: z.boolean().default(true),
  contestDate: z.string().optional(),
});

export const updateCitySchema = z.object({
  name: z.string().min(1).optional(),
  timezone: z.string().min(1).optional(),
  startTime: z.string().nullable().optional(),
  durationMin: z.number().int().positive().optional(),
  mapEnabled: z.boolean().optional(),
  contestDate: z.string().nullable().optional(),
});

// ── Zone ──

export const zoneTypeSchema = z.enum([
  'task',
  'side-quest',
  'photo',
  'water',
  'snack',
]);
export const difficultySchema = z.enum(['easy', 'medium', 'hard']);

export const createZoneSchema = z.object({
  name: z.string().min(1),
  type: zoneTypeSchema,
  description: z.string().optional(),
  difficulty: difficultySchema.optional(),
  positionX: z.number().int().default(0),
  positionY: z.number().int().default(0),
  sizeWidth: z.number().int().default(140),
  sizeHeight: z.number().int().default(120),
  ejudgeProblemId: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

export const updateZoneSchema = createZoneSchema.partial();

// ── Team ──

export const createTeamSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(4),
  teamName: z.string().min(1),
});

export const bulkCreateTeamsSchema = z.object({
  teams: z.array(createTeamSchema).min(1),
});

// ── Announcement ──

export const createAnnouncementSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  important: z.boolean().default(false),
});
