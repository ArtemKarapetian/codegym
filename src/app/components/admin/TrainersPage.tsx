import { useEffect, useState } from 'react';
import { Plus, Trash2, KeyRound, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { api } from '@/lib/api';
import type { User } from '@shared/types';

export function TrainersPage() {
  const [trainers, setTrainers] = useState<User[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [resetTrainer, setResetTrainer] = useState<User | null>(null);

  const fetchTrainers = () => {
    api
      .get<User[]>('/api/admin/trainers')
      .then(setTrainers)
      .catch(console.error);
  };

  useEffect(() => {
    fetchTrainers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить тренера?')) return;
    await api.delete(`/api/admin/trainers/${id}`);
    toast.success('Тренер удалён');
    fetchTrainers();
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Тренеры</h1>
          <p className="text-sm text-gray-500 mt-1">
            Аккаунты тренеров. Тренер выбирает город → команду → ставит оценки
            за упражнения.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Новый тренер
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-[var(--tinkoff-border)] divide-y">
        {trainers.map((t) => (
          <div key={t.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--tinkoff-yellow)]/20 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">{t.teamName ?? t.login}</p>
                <p className="text-xs text-gray-400">
                  {t.login}
                  {t.plainPassword && (
                    <span className="ml-2 font-mono text-gray-500">
                      / {t.plainPassword}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setResetTrainer(t)}
                title="Сменить пароль"
              >
                <KeyRound className="w-4 h-4 text-gray-400" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(t.id)}
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </div>
          </div>
        ))}
        {trainers.length === 0 && (
          <div className="p-12 text-center text-gray-400 text-sm">
            Пока нет тренеров
          </div>
        )}
      </div>

      <CreateTrainerDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchTrainers}
      />
      <ResetTrainerPasswordDialog
        trainer={resetTrainer}
        onClose={() => setResetTrainer(null)}
      />
    </div>
  );
}

function CreateTrainerDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/trainers', { name, login, password });
      toast.success('Тренер создан');
      onCreated();
      onClose();
      setName('');
      setLogin('');
      setPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый тренер</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Имя</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иван Петров"
              required
            />
          </div>
          <div>
            <Label>Логин</Label>
            <Input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="ivan_petrov"
              required
            />
          </div>
          <div>
            <Label>Пароль</Label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="text"
              placeholder="минимум 4 символа"
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

function ResetTrainerPasswordDialog({
  trainer,
  onClose,
}: {
  trainer: User | null;
  onClose: () => void;
}) {
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const handleReset = async (customPassword?: string) => {
    if (!trainer) return;
    const res = await api.post<{ login: string; password: string }>(
      `/api/admin/reset-password/${trainer.id}`,
      customPassword ? { password: customPassword } : {},
    );
    setResult(`Логин: ${res.login}\nНовый пароль: ${res.password}`);
    toast.success('Пароль обновлён');
  };

  return (
    <Dialog
      open={!!trainer}
      onOpenChange={() => {
        onClose();
        setPassword('');
        setResult(null);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Сменить пароль: {trainer?.teamName ?? trainer?.login}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Новый пароль (или пусто)"
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
