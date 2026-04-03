import { useState, useEffect } from 'react';
import { Trophy, Medal, Search } from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { api } from '@/lib/api';
import type { TeamScore, ProblemResult } from '@shared/types';

const PROBLEMS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTeamName?: string;
  cityId: string;
}

export function LeaderboardModal({
  isOpen,
  onClose,
  currentTeamName = '',
  cityId,
}: LeaderboardModalProps) {
  const [leaderboard, setLeaderboard] = useState<TeamScore[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    api
      .get<TeamScore[]>(`/api/cities/${cityId}/leaderboard`)
      .then((data) => setLeaderboard(data))
      .catch((err) => console.error('Leaderboard error:', err));
  }, [isOpen, cityId]);

  const filteredLeaderboard = leaderboard.filter((team) =>
    team.teamName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Medal className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-700" />;
      default:
        return <span className="text-sm text-gray-500">#{rank}</span>;
    }
  };

  const renderProblem = (p: ProblemResult | undefined) => {
    if (!p) return <span className="text-gray-300">—</span>;
    if (p.solved) {
      return (
        <span className="font-mono text-xs font-bold text-green-700">
          +{p.attempts === 1 ? '' : p.attempts - 1}
        </span>
      );
    }
    return (
      <span className="font-mono text-xs text-red-400">-{p.attempts}</span>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[calc(100vw-2rem)] w-full max-h-[95vh] flex flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[var(--tinkoff-yellow)]" />
            Лидерборд
          </DialogTitle>
          <DialogDescription>
            Текущие результаты команд в контесте
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Поиск команды..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-auto border border-[var(--tinkoff-border)] rounded-lg">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="bg-[var(--tinkoff-gray)] border-b">
                <th className="px-1 py-2 text-center w-10">#</th>
                <th className="px-2 py-2 text-left">Команда</th>
                <th className="px-1 py-2 text-center w-10">Σ</th>
                <th className="px-1 py-2 text-center w-12">Штраф</th>
                {PROBLEMS.map((p) => (
                  <th key={p} className="px-1 py-2 text-center w-9 font-bold">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLeaderboard.map((team) => {
                const isMe =
                  team.isCurrentTeam || team.teamName === currentTeamName;
                return (
                  <tr
                    key={team.rank}
                    className={`border-b border-gray-100 ${isMe ? 'bg-[var(--tinkoff-yellow)]/20' : ''}`}
                  >
                    <td className="px-1 py-2 text-center">
                      {getRankIcon(team.rank)}
                    </td>
                    <td className="px-2 py-2 truncate">
                      <span
                        className={`text-sm ${isMe ? 'font-semibold' : ''}`}
                      >
                        {team.teamName}
                      </span>
                      {isMe && (
                        <span className="text-xs bg-[var(--tinkoff-yellow)] px-1 py-0.5 rounded ml-1">
                          Вы
                        </span>
                      )}
                    </td>
                    <td className="px-1 py-2 text-center font-mono font-bold">
                      {team.solved}
                    </td>
                    <td className="px-1 py-2 text-center font-mono text-red-600 text-xs">
                      {team.penalty}
                    </td>
                    {PROBLEMS.map((p) => (
                      <td key={p} className="px-1 py-2 text-center">
                        {renderProblem(
                          team.problems?.[p] as ProblemResult | undefined,
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredLeaderboard.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Trophy className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">Команда не найдена</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
