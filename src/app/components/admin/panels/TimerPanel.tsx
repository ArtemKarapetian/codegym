import { useState, useEffect } from 'react';
import { Play, Pause, Square, RotateCcw, Clock } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { TimerState } from '@shared/types';

interface TimerPanelProps {
  cityId: string;
}

function formatTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function TimerPanel({ cityId }: TimerPanelProps) {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [editH, setEditH] = useState('');
  const [editM, setEditM] = useState('');
  const [editS, setEditS] = useState('');
  const [showEdit, setShowEdit] = useState(false);

  const fetchTimer = () => {
    api
      .get<TimerState>(`/api/cities/${cityId}/timer`)
      .then(setTimer)
      .catch(console.error);
  };

  useEffect(() => {
    fetchTimer();
    const interval = setInterval(fetchTimer, 3000);
    return () => clearInterval(interval);
  }, [cityId]);

  const action = async (act: string) => {
    const result = await api.post<TimerState>(
      `/api/cities/${cityId}/timer/${act}`,
    );
    setTimer(result);
  };

  if (!timer) return null;

  const statusColors: Record<string, string> = {
    pending: 'text-gray-500',
    running: 'text-green-600',
    paused: 'text-yellow-600',
    finished: 'text-gray-400',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Ожидание',
    running: 'Идёт',
    paused: 'Пауза',
    finished: 'Завершён',
  };

  return (
    <div className="bg-white rounded-xl border border-[var(--tinkoff-border)] p-8">
      <div className="text-center mb-8">
        <p className={`text-sm font-medium mb-2 ${statusColors[timer.status]}`}>
          {statusLabels[timer.status]}
        </p>
        <p className="text-6xl font-mono font-bold tracking-wider">
          {formatTime(timer.remainingSeconds)}
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Всего: {timer.durationMin} минут
        </p>
      </div>

      {/* Set remaining time */}
      <div className="flex items-center justify-center mb-6">
        {!showEdit ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-gray-400 gap-1"
            onClick={() => {
              const h = Math.floor(timer.remainingSeconds / 3600);
              const m = Math.floor((timer.remainingSeconds % 3600) / 60);
              const s = timer.remainingSeconds % 60;
              setEditH(String(h));
              setEditM(String(m));
              setEditS(String(s));
              setShowEdit(true);
            }}
          >
            <Clock className="w-3 h-3" />
            Изменить время
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={99}
              value={editH}
              onChange={(e) => setEditH(e.target.value)}
              className="w-16 text-center font-mono"
              placeholder="ч"
            />
            <span className="font-mono font-bold">:</span>
            <Input
              type="number"
              min={0}
              max={59}
              value={editM}
              onChange={(e) => setEditM(e.target.value)}
              className="w-16 text-center font-mono"
              placeholder="м"
            />
            <span className="font-mono font-bold">:</span>
            <Input
              type="number"
              min={0}
              max={59}
              value={editS}
              onChange={(e) => setEditS(e.target.value)}
              className="w-16 text-center font-mono"
              placeholder="с"
            />
            <Button
              size="sm"
              className="bg-[var(--tinkoff-yellow)] hover:bg-[var(--tinkoff-yellow)]/90 text-black"
              onClick={async () => {
                const total =
                  (parseInt(editH) || 0) * 3600 +
                  (parseInt(editM) || 0) * 60 +
                  (parseInt(editS) || 0);
                const result = await api.post<TimerState>(
                  `/api/cities/${cityId}/timer/set-remaining`,
                  { remainingSeconds: total },
                );
                setTimer(result);
                setShowEdit(false);
                toast.success(`Время установлено: ${formatTime(total)}`);
              }}
            >
              OK
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowEdit(false)}
            >
              Отмена
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        {timer.status === 'pending' && (
          <Button
            onClick={() => action('start')}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Play className="w-4 h-4" />
            Старт
          </Button>
        )}
        {timer.status === 'running' && (
          <>
            <Button
              onClick={() => action('pause')}
              variant="outline"
              className="gap-2"
            >
              <Pause className="w-4 h-4" />
              Пауза
            </Button>
            <Button
              onClick={() => action('stop')}
              variant="destructive"
              className="gap-2"
            >
              <Square className="w-4 h-4" />
              Стоп
            </Button>
          </>
        )}
        {timer.status === 'paused' && (
          <>
            <Button
              onClick={() => action('resume')}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4" />
              Продолжить
            </Button>
            <Button
              onClick={() => action('stop')}
              variant="destructive"
              className="gap-2"
            >
              <Square className="w-4 h-4" />
              Стоп
            </Button>
          </>
        )}
        {timer.status === 'finished' && (
          <Button
            onClick={() => action('start')}
            variant="outline"
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Перезапустить
          </Button>
        )}
      </div>
    </div>
  );
}
