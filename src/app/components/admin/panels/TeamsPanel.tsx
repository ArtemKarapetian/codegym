import { useState, useEffect } from 'react';
import { Copy, Check, KeyRound, Star } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { User } from '@shared/types';

interface TeamsPanelProps {
  cityId: string;
}

export function TeamsPanel({ cityId }: TeamsPanelProps) {
  const [teams, setTeams] = useState<User[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resetTeam, setResetTeam] = useState<User | null>(null);
  const [funPoints, setFunPoints] = useState<Record<string, number>>({});
  const [funTeam, setFunTeam] = useState<User | null>(null);

  const fetchTeams = () => {
    api
      .get<User[]>(`/api/cities/${cityId}/teams`)
      .then(setTeams)
      .catch(console.error);
  };

  useEffect(() => {
    fetchTeams();
    fetch(`/api/public/cities/${cityId}/fun-points`)
      .then((r) => r.json())
      .then((data: Record<string, number>) => setFunPoints(data))
      .catch(console.error);
  }, [cityId]);

  const copyLogin = (login: string, id: string) => {
    navigator.clipboard.writeText(login);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{teams.length} команд</p>
        <p className="text-xs text-gray-400">
          Команды создаются через кнопку «Аккаунты» на главной
        </p>
      </div>

      <div className="bg-white rounded-lg border border-[var(--tinkoff-border)] divide-y">
        {teams.map((team) => (
          <div key={team.id} className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[var(--tinkoff-gray)] rounded-full flex items-center justify-center text-xs font-medium">
                {(team.teamName || team.login).substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-sm">{team.teamName}</p>
                <p className="text-xs text-gray-400">
                  {team.login}
                  {team.plainPassword && (
                    <span className="ml-2 font-mono text-gray-500">
                      / {team.plainPassword}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyLogin(team.login, team.id)}
                title="Копировать логин"
              >
                {copiedId === team.id ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFunTeam(team)}
                title="Fun очки"
              >
                <Star className="w-4 h-4 text-purple-400" />
                {funPoints[team.teamName ?? ''] ? (
                  <span className="text-xs text-purple-600 -ml-1">
                    {funPoints[team.teamName ?? '']}
                  </span>
                ) : null}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setResetTeam(team)}
                title="Сменить пароль"
              >
                <KeyRound className="w-4 h-4 text-gray-400" />
              </Button>
            </div>
          </div>
        ))}
        {teams.length === 0 && (
          <div className="p-8 text-center text-gray-400 text-sm">
            Нет команд
          </div>
        )}
      </div>

      <ResetPasswordDialog
        team={resetTeam}
        onClose={() => setResetTeam(null)}
      />

      <FunPointsDialog
        team={funTeam}
        cityId={cityId}
        currentPoints={funPoints[funTeam?.teamName ?? ''] ?? 0}
        onClose={() => setFunTeam(null)}
        onSaved={(teamName, pts) => {
          setFunPoints((prev) => ({ ...prev, [teamName]: pts }));
          setFunTeam(null);
        }}
      />
    </div>
  );
}

function ResetPasswordDialog({
  team,
  onClose,
}: {
  team: User | null;
  onClose: () => void;
}) {
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const handleReset = async (customPassword?: string) => {
    if (!team) return;
    const res = await api.post<{ login: string; password: string }>(
      `/api/admin/reset-password/${team.id}`,
      customPassword ? { password: customPassword } : {},
    );
    setResult(`Логин: ${res.login}\nНовый пароль: ${res.password}`);
    toast.success('Пароль обновлён');
  };

  return (
    <Dialog
      open={!!team}
      onOpenChange={() => {
        onClose();
        setPassword('');
        setResult(null);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Сменить пароль: {team?.teamName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Новый пароль (или оставить пустым)"
            />
            <Button
              onClick={() => handleReset(password || undefined)}
              className="shrink-0"
            >
              {password ? 'Задать' : 'Случайный'}
            </Button>
          </div>
          {result && (
            <pre className="p-3 bg-gray-50 border rounded-lg text-sm whitespace-pre-wrap font-mono">
              {result}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FunPointsDialog({
  team,
  cityId,
  currentPoints,
  onClose,
  onSaved,
}: {
  team: User | null;
  cityId: string;
  currentPoints: number;
  onClose: () => void;
  onSaved: (teamName: string, points: number) => void;
}) {
  const key = team?.id ?? '';
  const [points, setPoints] = useState(String(currentPoints));

  // Reset when different team opens — use key pattern instead of effect
  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    setPrevKey(key);
    setPoints(String(currentPoints));
  }

  return (
    <Dialog open={!!team} onOpenChange={onClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Fun очки: {team?.teamName}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            type="number"
            step="0.1"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="font-mono"
          />
          <Button
            onClick={async () => {
              if (!team?.teamName) return;
              const pts = parseFloat(points) || 0;
              await api.post(`/api/cities/${cityId}/fun-points`, {
                teamName: team.teamName,
                points: pts,
              });
              toast.success(`${team.teamName}: ${pts} очков`);
              onSaved(team.teamName, pts);
            }}
          >
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
