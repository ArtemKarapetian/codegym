import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MapPin, Clock, Trophy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { api } from '@/lib/api';
import type { City } from '@shared/types';

export function CitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchCities = () => {
    api.get<City[]>('/api/cities').then(setCities).catch(console.error);
  };

  useEffect(() => {
    fetchCities();
  }, []);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const getCityTime = (tz: string) => {
    try {
      return now.toLocaleTimeString('ru-RU', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: 'Ожидание', color: 'bg-gray-100 text-gray-700' },
    running: { label: 'Идёт', color: 'bg-green-100 text-green-700' },
    paused: { label: 'Пауза', color: 'bg-yellow-100 text-yellow-700' },
    finished: { label: 'Завершён', color: 'bg-gray-200 text-gray-600' },
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Города</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              setSyncing(true);
              try {
                const res = await api.post<{
                  synced: number;
                  skippedNoCity: string[];
                  error?: string;
                }>('/api/admin/sync-sheets', {});
                if (res.error) {
                  toast.error(`Ошибка: ${res.error}`);
                } else {
                  toast.success(
                    `Синхронизировано: ${res.synced} команд` +
                      (res.skippedNoCity.length
                        ? `. Города не найдены: ${res.skippedNoCity.join(', ')}`
                        : ''),
                  );
                }
              } catch (err) {
                toast.error('Ошибка синхронизации');
                console.error(err);
              } finally {
                setSyncing(false);
              }
            }}
            disabled={syncing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Синхронизация...' : 'Google Sheets'}
          </Button>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Добавить город
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {cities.map((city) => {
          const status = statusLabels[city.timerStatus] || statusLabels.pending;
          return (
            <Link
              key={city.id}
              to={`/admin/cities/${city.id}`}
              className="bg-white rounded-xl border border-[var(--tinkoff-border)] p-5 hover:shadow-md transition-shadow flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[var(--tinkoff-yellow)]/20 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{city.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {getCityTime(city.timezone)}
                    </span>
                    <span>{city.durationMin} мин</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={status.color}>{status.label}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(`/public/leaderboard/${city.id}`, '_blank');
                  }}
                  title="Открыть лидерборд"
                >
                  <Trophy className="w-4 h-4 text-[var(--tinkoff-yellow)]" />
                </Button>
              </div>
            </Link>
          );
        })}

        {cities.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Нет городов. Создайте первый.</p>
          </div>
        )}
      </div>

      <CreateCityDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchCities}
      />
    </div>
  );
}

function CreateCityDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('Europe/Moscow');
  const [durationMin, setDurationMin] = useState(240);
  const [mapEnabled, setMapEnabled] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/api/cities', { name, timezone, durationMin, mapEnabled });
    onCreated();
    onClose();
    setName('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый город</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Название</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Москва"
              required
            />
          </div>
          <div>
            <Label>Часовой пояс</Label>
            <Input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="Europe/Moscow"
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
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="mapEnabled"
              checked={mapEnabled}
              onChange={(e) => setMapEnabled(e.target.checked)}
            />
            <Label htmlFor="mapEnabled">Показывать карту</Label>
          </div>
          <Button type="submit" className="w-full">
            Создать
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
