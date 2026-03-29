export interface LeaderboardEntry {
  teamLogin: string;
  score: number;
  penalty: number;
  solved: number;
}

export interface ILeaderboardSource {
  getLeaderboard(cityId: string): Promise<LeaderboardEntry[]>;
  pollIntervalMs: number;
}

export interface TaskSubmissionResult {
  accepted: boolean;
  score: number;
  penalty: number;
}

export interface ITaskSource {
  getSubmissionStatus(
    teamLogin: string,
    problemId: string,
  ): Promise<TaskSubmissionResult | null>;
  getTeamSubmissions(
    teamLogin: string,
    contestId: string,
  ): Promise<TaskSubmissionResult[]>;
}
