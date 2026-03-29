import { useState } from 'react';
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

interface TeamScore {
  rank: number;
  teamName: string;
  score: number;
  penalty: number;
  solved: number;
  isCurrentTeam?: boolean;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTeamName?: string;
}

const mockLeaderboard: TeamScore[] = [
  { rank: 1, teamName: 'CodeMasters', score: 850, penalty: 45, solved: 8 },
  { rank: 2, teamName: 'AlgoWarriors', score: 720, penalty: 60, solved: 7 },
  { rank: 3, teamName: 'ByteBusters', score: 680, penalty: 55, solved: 7 },
  { rank: 4, teamName: 'StackOverflow', score: 620, penalty: 70, solved: 6 },
  {
    rank: 5,
    teamName: 'Team Alpha',
    score: 580,
    penalty: 80,
    solved: 6,
    isCurrentTeam: true,
  },
  { rank: 6, teamName: 'DevDynamos', score: 540, penalty: 65, solved: 5 },
  { rank: 7, teamName: 'CodeNinjas', score: 500, penalty: 90, solved: 5 },
  { rank: 8, teamName: 'BugHunters', score: 460, penalty: 75, solved: 4 },
  { rank: 9, teamName: 'SyntaxError', score: 420, penalty: 85, solved: 4 },
  { rank: 10, teamName: 'GitCommit', score: 380, penalty: 95, solved: 3 },
];

export function LeaderboardModal({
  isOpen,
  onClose,
  currentTeamName = 'Team Alpha',
}: LeaderboardModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLeaderboard = mockLeaderboard.filter((team) =>
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Поиск команды..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
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
                    {team.solved}/10
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

        {/* Legend */}
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
            <strong>Решено:</strong> Количество успешно решённых задач из 10
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
