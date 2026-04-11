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
  durationMin: z.number().int().positive().default(240),
  sheetId: z.string().nullable().optional(),
  sheetRange: z.string().min(1).optional(),
  exerciseNames: z.array(z.string()).length(9).nullable().optional(),
  contestDate: z.string().nullable().optional(),
});

export const updateCitySchema = z.object({
  name: z.string().min(1).optional(),
  timezone: z.string().min(1).optional(),
  durationMin: z.number().int().positive().optional(),
  sheetId: z.string().nullable().optional(),
  sheetRange: z.string().min(1).optional(),
  exerciseNames: z.array(z.string()).length(9).nullable().optional(),
  contestDate: z.string().nullable().optional(),
});
