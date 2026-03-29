// ── Zone ──

export type ZoneType = 'task' | 'side-quest' | 'photo' | 'water' | 'snack';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface ZoneData {
  id: string;
  name: string;
  type: ZoneType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  description?: string;
  difficulty?: Difficulty;
  completed?: boolean;
  ejudgeProblemId?: string;
  sortOrder: number;
}

// ── City ──

export type TimerStatus = 'pending' | 'running' | 'paused' | 'finished';

export interface City {
  id: string;
  name: string;
  timezone: string;
  startTime: string | null;
  durationMin: number;
  timerStatus: TimerStatus;
  mapEnabled: boolean;
  createdAt: string;
}

export interface TimerState {
  status: TimerStatus;
  remainingSeconds: number;
  startTime: string | null;
  durationMin: number;
}

// ── User ──

export type UserRole = 'admin' | 'team';

export interface User {
  id: string;
  login: string;
  role: UserRole;
  teamName: string | null;
  cityId: string | null;
  createdAt: string;
}

// ── Announcement ──

export interface Announcement {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  important: boolean;
  isNew: boolean;
}

// ── Leaderboard ──

export interface TeamScore {
  rank: number;
  teamName: string;
  score: number;
  penalty: number;
  solved: number;
  isCurrentTeam?: boolean;
}

// ── Team Progress ──

export interface TeamProgress {
  zoneId: string;
  completed: boolean;
  completedAt: string | null;
}
