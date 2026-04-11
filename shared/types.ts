// ── City ──

export type TimerStatus = 'pending' | 'running' | 'paused' | 'finished';

export interface City {
  id: string;
  name: string;
  timezone: string;
  startTime: string | null;
  durationMin: number;
  timerStatus: TimerStatus;
  contestDate: string | null;
  sheetId: string | null;
  sheetRange: string;
  exerciseNames: string[] | null;
  createdAt: string;
}

export interface TimerState {
  status: TimerStatus;
  remainingSeconds: number;
  startTime: string | null;
  durationMin: number;
}

// ── User ──

export type UserRole = 'admin';

export interface User {
  id: string;
  login: string;
  role: UserRole;
  createdAt: string;
}

// ── Leaderboard ──

export interface ProblemResult {
  solved: boolean;
}

export interface TeamScore {
  rank: number;
  teamName: string;
  login: string;
  score: number;
  penalty: number;
  problems: Record<string, ProblemResult>;
}
