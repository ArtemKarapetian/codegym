import { useState, useEffect } from 'react';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
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
