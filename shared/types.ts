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
  problemLetter?: string;
  exercise?: string;
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
  contestDate: string | null;
  chatUrl: string | null;
  createdAt: string;
}

export interface TimerState {
  status: TimerStatus;
  remainingSeconds: number;
  startTime: string | null;
  durationMin: number;
}

// ── User ──

export type UserRole = 'admin' | 'team' | 'trainer';

export interface User {
  id: string;
  login: string;
  role: UserRole;
  teamName: string | null;
  cityId: string | null;
  plainPassword?: string | null;
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
  targetTeamIds?: string[] | null;
}

// ── Leaderboard ──

export interface ProblemResult {
  score: number;
  penalty: number;
  attempts: number;
  solved: boolean;
}

export interface TeamScore {
  rank: number;
  teamName: string;
  score: number;
  penalty: number;
  solved: number;
  problems: Record<string, ProblemResult>;
  isCurrentTeam?: boolean;
}

// ── Team Progress ──

export interface TeamProgress {
  zoneId: string;
  completed: boolean;
  completedAt: string | null;
}
