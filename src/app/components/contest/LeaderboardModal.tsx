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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { api } from '@/lib/api';
import type { TeamScore } from '@shared/types';

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
      .then(setLeaderboard)
      .catch(console.error);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
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

        <div className="flex-1 overflow-y-auto border border-[var(--tinkoff-border)] rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-[var(--tinkoff-gray)]">
                <TableHead className="w-16">Место</TableHead>
                <TableHead>Команда</TableHead>
                <TableHead className="text-right w-24">Баллы</TableHead>
                <TableHead className="text-right w-24">Штраф</TableHead>
                <TableHead className="text-right w-24">Решено</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeaderboard.map((team) => (
                <TableRow
                  key={team.rank}
                  className={
                    team.isCurrentTeam || team.teamName === currentTeamName
                      ? 'bg-[var(--tinkoff-yellow)]/20 font-medium'
                      : ''
                  }
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center justify-center">
                      {getRankIcon(team.rank)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {team.teamName}
                      {(team.isCurrentTeam ||
                        team.teamName === currentTeamName) && (
                        <span className="text-xs bg-[var(--tinkoff-yellow)] px-2 py-0.5 rounded">
                          Вы
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {team.score}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-600">
                    +{team.penalty}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {team.solved}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredLeaderboard.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Trophy className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">Команда не найдена</p>
          </div>
        )}

        <div className="bg-[var(--tinkoff-gray)] rounded-lg p-4 text-sm space-y-1">
          <p className="font-medium mb-2">Пояснение:</p>
          <p className="text-gray-600">
            <strong>Баллы:</strong> Сумма баллов за решённые задачи
          </p>
          <p className="text-gray-600">
            <strong>Штраф:</strong> Дополнительное время за неверные попытки
            (минуты)
          </p>
          <p className="text-gray-600">
            <strong>Решено:</strong> Количество успешно решённых задач
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
