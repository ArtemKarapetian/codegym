import { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, Copy, Check } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { api } from '@/lib/api';
import type { User } from '@shared/types';

interface TeamsPanelProps {
  cityId: string;
}

export function TeamsPanel({ cityId }: TeamsPanelProps) {
  const [teams, setTeams] = useState<User[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTeams = () => {
    api
      .get<User[]>(`/api/cities/${cityId}/teams`)
      .then(setTeams)
      .catch(console.error);
  };

  useEffect(() => {
    fetchTeams();
  }, [cityId]);

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить команду?')) return;
    await api.delete(`/api/cities/${cityId}/teams/${id}`);
    fetchTeams();
  };

  const copyLogin = (login: string, id: string) => {
    navigator.clipboard.writeText(login);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{teams.length} команд</p>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowBulk(true)}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Массовое создание
          </Button>
          <Button
            onClick={() => setShowCreate(true)}
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Добавить
          </Button>
        </div>
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
                <p className="text-xs text-gray-400">{team.login}</p>
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
                onClick={() => handleDelete(team.id)}
              >
                <Trash2 className="w-4 h-4 text-red-400" />
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

      <CreateTeamDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        cityId={cityId}
        onCreated={fetchTeams}
      />
      <BulkCreateDialog
        open={showBulk}
        onClose={() => setShowBulk(false)}
        cityId={cityId}
        onCreated={fetchTeams}
      />
    </div>
  );
}

function CreateTeamDialog({
  open,
  onClose,
  cityId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  cityId: string;
  onCreated: () => void;
}) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [teamName, setTeamName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post(`/api/cities/${cityId}/teams`, {
      login,
      password,
      teamName,
    });
    onCreated();
    onClose();
    setLogin('');
    setPassword('');
    setTeamName('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая команда</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Логин</Label>
            <Input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="team-01"
              required
            />
          </div>
          <div>
            <Label>Пароль</Label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="1234"
              required
            />
          </div>
          <div>
            <Label>Название команды</Label>
            <Input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team Alpha"
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Создать
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BulkCreateDialog({
  open,
  onClose,
  cityId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  cityId: string;
  onCreated: () => void;
}) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const teams = text
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,\t;]+/).map((s) => s.trim());
        return {
          login: parts[0],
          password: parts[1] || '1234',
          teamName: parts[2] || parts[0],
        };
      });

    const res = await api.post<{ created: unknown[]; errors: string[] }>(
      `/api/cities/${cityId}/teams/bulk`,
      { teams },
    );

    setResult(
      `Создано: ${res.created.length}` +
        (res.errors.length > 0 ? `\nОшибки: ${res.errors.join(', ')}` : ''),
    );
    onCreated();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        onClose();
        setResult(null);
        setText('');
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Массовое создание команд</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>
              По одной на строку: логин, пароль, название (разделитель: запятая
              или табуляция)
            </Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`team-01, 1234, Команда Альфа\nteam-02, 5678, Команда Бета`}
              rows={8}
              required
            />
          </div>
          {result && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm whitespace-pre-line">
              {result}
            </div>
          )}
          <Button type="submit" className="w-full">
            Создать
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
