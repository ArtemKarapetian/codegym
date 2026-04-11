import type { City, PenaltyMode, User, TeamScore, TimerState } from './types';

// ── Auth ──

export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface MeResponse {
  user: User;
}

// ── Cities ──

export interface CreateCityRequest {
  name: string;
  timezone: string;
  durationMin?: number;
  sheetId?: string | null;
  sheetRange?: string;
  exerciseNames?: string[] | null;
  contestDate?: string | null;
  penaltyMode?: PenaltyMode;
}

export interface UpdateCityRequest {
  name?: string;
  timezone?: string;
  durationMin?: number;
  sheetId?: string | null;
  sheetRange?: string;
  exerciseNames?: string[] | null;
  contestDate?: string | null;
  penaltyMode?: PenaltyMode;
}

export interface PublicCity {
  id: string;
  name: string;
  timezone: string;
  contestDate: string | null;
  timerStatus: City['timerStatus'];
}

export type CitiesResponse = City[];
export type CityResponse = City;
export type PublicCitiesResponse = PublicCity[];

// ── Timer ──

export type TimerResponse = TimerState;

// ── Leaderboard ──

export interface LeaderboardResponse {
  teams: TeamScore[];
  frozen: boolean;
  taskCount: number;
}
