import { MockLeaderboardSource } from './mock.leaderboard';
import type { ILeaderboardSource } from './types';

export type DataSourceType = 'mock' | 'ejudge' | 'gsheets';

export function createLeaderboardSource(
  type: DataSourceType = 'mock',
): ILeaderboardSource {
  switch (type) {
    case 'mock':
      return new MockLeaderboardSource();
    case 'ejudge':
      // TODO: implement EJudgeLeaderboardSource
      throw new Error('eJudge data source not yet implemented');
    case 'gsheets':
      // TODO: implement GSheetsLeaderboardSource
      throw new Error('Google Sheets data source not yet implemented');
  }
}

export type { ILeaderboardSource, ITaskSource } from './types';
