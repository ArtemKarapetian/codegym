import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  RotateCcw,
  Snowflake,
  Sun,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { api } from '@/lib/api';
import type { City, PenaltyMode, TimerState } from '@shared/types';
import type { LeaderboardResponse } from '@shared/api';

function formatRemaining(s: number): string {
  const safe = Math.max(0, s);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const sec = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function CityDetailPage() {
  const { cityId } = useParams<{ cityId: string }>();
  const [city, setCity] = useState<City | null>(null);
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [frozen, setFrozen] = useState(false);

  const [sheetId, setSheetId] = useState('');
  const [sheetRange, setSheetRange] = useState('Таблица');
  const [durationMin, setDurationMin] = useState(240);
  const [penaltyMode, setPenaltyMode] = useState<PenaltyMode>('sheet');
  const [remainingInput, setRemainingInput] = useState('');

  const refreshCity = useCallback(async () => {
    if (!cityId) return;
    const c = await api.get<City>(`/api/cities/${cityId}`);
    setCity(c);
    setSheetId(c.sheetId ?? '');
    setSheetRange(c.sheetRange);
    setDurationMin(c.durationMin);
    setPenaltyMode(c.penaltyMode);
  }, [cityId]);

  const refreshTimer = useCallback(async () => {
    if (!cityId) return;
    const t = await api.get<TimerState>(`/api/cities/${cityId}/timer`);
    setTimer(t);
    setRemainingInput(formatRemaining(t.remainingSeconds));
  }, [cityId]);

  const refreshLeaderboardState = useCallback(async () => {
    if (!cityId) return;
    try {
      const body = await fetch(`/api/public/cities/${cityId}/leaderboard`).then(
        (r) => r.json() as Promise<LeaderboardResponse>,
      );
      setFrozen(body.frozen);
    } catch (err) {
      console.error(err);
    }
  }, [cityId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await Promise.all([
          refreshCity(),
          refreshTimer(),
          refreshLeaderboardState(),
        ]);
      } catch (err) {
        if (!cancelled) console.error(err);
      }
    };
    void run();
    const t = setInterval(() => {
      void refreshTimer().catch(console.error);
      void refreshLeaderboardState().catch(console.error);
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [refreshCity, refreshTimer, refreshLeaderboardState]);

  if (!city || !cityId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--tinkoff-yellow)] border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleTimer = async (action: 'start' | 'pause' | 'resume' | 'stop') => {
    try {
      await api.post<TimerState>(`/api/cities/${cityId}/timer/${action}`);
      await refreshTimer();
      toast.success(`Таймер: ${action}`);
      if (action === 'start') {
        setFrozen(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка таймера');
    }
  };

  const handleSetRemaining = async () => {
    const parts = remainingInput.split(':').map(Number);
    if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) {
      toast.error('Формат: ЧЧ:ММ:СС');
      return;
    }
    const [h, m, s] = parts;
    const remainingSeconds = h * 3600 + m * 60 + s;
    try {
      await api.post<TimerState>(`/api/cities/${cityId}/timer/set-remaining`, {
        remainingSeconds,
      });
      await refreshTimer();
      toast.success('Оставшееся время обновлено');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const handleFreeze = async () => {
    try {
      await api.post(`/api/cities/${cityId}/leaderboard/freeze`, {});
      setFrozen(true);
      toast.success('Лидерборд заморожен');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const handleUnfreeze = async () => {
    try {
      await api.post(`/api/cities/${cityId}/leaderboard/unfreeze`, {});
      setFrozen(false);
      toast.success('Лидерборд разморожен');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const handleSave = async () => {
    try {
      await api.put<City>(`/api/cities/${cityId}`, {
        sheetId: sheetId.trim() || null,
        sheetRange: sheetRange.trim() || 'Таблица',
        durationMin,
        penaltyMode,
      });
      await refreshCity();
      toast.success('Сохранено');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/admin"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">{city.name}</h1>
        <span className="text-sm text-gray-500">{city.timezone}</span>
        <div className="ml-auto">
          <Button
            variant="outline"
            onClick={() =>
              window.open(`/public/leaderboard/${city.id}`, '_blank')
            }
          >
            Открыть лидерборд
          </Button>
        </div>
      </div>

      {/* Timer */}
      <section className="bg-white rounded-xl border border-[var(--tinkoff-border)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Таймер</h2>
          <span className="font-mono text-3xl font-bold">
            {timer ? formatRemaining(timer.remainingSeconds) : '--:--:--'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Button
            onClick={() => handleTimer('start')}
            disabled={timer?.status === 'running'}
            className="gap-2"
          >
            <Play className="w-4 h-4" /> Старт
          </Button>
          <Button
            variant="outline"
            onClick={() => handleTimer('pause')}
            disabled={timer?.status !== 'running'}
            className="gap-2"
          >
            <Pause className="w-4 h-4" /> Пауза
          </Button>
          <Button
            variant="outline"
            onClick={() => handleTimer('resume')}
            disabled={timer?.status !== 'paused'}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Продолжить
          </Button>
          <Button
            variant="outline"
            onClick={() => handleTimer('stop')}
            className="gap-2"
          >
            <Square className="w-4 h-4" /> Стоп
          </Button>
          <span className="ml-auto text-sm text-gray-500">
            Статус: {timer?.status ?? '...'}
          </span>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label>Оставшееся время (ЧЧ:ММ:СС)</Label>
            <Input
              value={remainingInput}
              onChange={(e) => setRemainingInput(e.target.value)}
              placeholder="04:00:00"
              className="font-mono"
            />
          </div>
          <Button variant="outline" onClick={handleSetRemaining}>
            Применить
          </Button>
        </div>
      </section>

      {/* Freeze */}
      <section className="bg-white rounded-xl border border-[var(--tinkoff-border)] p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-lg">Заморозка рейтинга</h2>
          <span
            className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
              frozen ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {frozen ? 'Заморожен' : 'Живой'}
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Автоматически срабатывает за 30 минут до конца. Можно заморозить
          вручную или разморозить в любой момент.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleFreeze}
            disabled={frozen}
            className="gap-2"
          >
            <Snowflake className="w-4 h-4" />
            Заморозить сейчас
          </Button>
          <Button
            variant="outline"
            onClick={handleUnfreeze}
            disabled={!frozen}
            className="gap-2"
          >
            <Sun className="w-4 h-4" />
            Разморозить
          </Button>
        </div>
      </section>

      {/* Sheet + settings */}
      <section className="bg-white rounded-xl border border-[var(--tinkoff-border)] p-6">
        <h2 className="font-semibold text-lg mb-4">Google Sheet</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Spreadsheet ID</Label>
            <Input
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              placeholder="1HQrcJhyK0CpTCyqBf5m..."
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Label>Название вкладки</Label>
            <Input
              value={sheetRange}
              onChange={(e) => setSheetRange(e.target.value)}
              placeholder="Таблица"
            />
          </div>
          <div>
            <Label>Длительность (минуты)</Label>
            <Input
              type="number"
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="mt-4 flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
          <Switch
            id="penalty-mode"
            checked={penaltyMode === 'computed'}
            onCheckedChange={(checked) =>
              setPenaltyMode(checked ? 'computed' : 'sheet')
            }
          />
          <div className="flex-1">
            <Label htmlFor="penalty-mode" className="cursor-pointer">
              Считать штраф самому
            </Label>
            <p className="text-xs text-gray-500 mt-1">
              {penaltyMode === 'computed'
                ? 'Штраф = сумма неудачных попыток по решённым задачам (+2 = 2 штрафа, + = 0). Колонка «Штраф» в таблице игнорируется.'
                : 'Штраф читается из колонки «Штраф» в Google Sheet как есть.'}
            </p>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          Сохранить изменения
        </Button>
      </div>
    </div>
  );
}
