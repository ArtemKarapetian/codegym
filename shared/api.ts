import type {
  City,
  User,
  ZoneData,
  Announcement,
  TeamScore,
  TimerState,
  TeamProgress,
} from './types';

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
  startTime?: string;
  durationMin?: number;
  mapEnabled?: boolean;
}

export interface UpdateCityRequest {
  name?: string;
  timezone?: string;
  startTime?: string | null;
  durationMin?: number;
  mapEnabled?: boolean;
}

export type CitiesResponse = City[];
export type CityResponse = City;

// ── Zones ──

export interface CreateZoneRequest {
  name: string;
  type: ZoneData['type'];
  description?: string;
  difficulty?: ZoneData['difficulty'];
  positionX?: number;
  positionY?: number;
  sizeWidth?: number;
  sizeHeight?: number;
  ejudgeProblemId?: string;
  sortOrder?: number;
}

export type UpdateZoneRequest = Partial<CreateZoneRequest>;

export type ZonesResponse = ZoneData[];

// ── Teams ──

export interface CreateTeamRequest {
  login: string;
  password: string;
  teamName: string;
}

export interface BulkCreateTeamsRequest {
  teams: CreateTeamRequest[];
}

export type TeamsResponse = User[];

// ── Announcements ──

export interface CreateAnnouncementRequest {
  title: string;
  message: string;
  important?: boolean;
}

export type AnnouncementsResponse = Announcement[];

// ── Timer ──

export type TimerResponse = TimerState;

// ── Leaderboard ──

export type LeaderboardResponse = TeamScore[];

// ── Progress ──

export type ProgressResponse = TeamProgress[];
