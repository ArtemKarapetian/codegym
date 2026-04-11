import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Trophy, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { api } from '@/lib/api';
import type { City } from '@shared/types';

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Ожидание', color: 'bg-gray-100 text-gray-700' },
  running: { label: 'Идёт', color: 'bg-green-100 text-green-700' },
  paused: { label: 'Пауза', color: 'bg-yellow-100 text-yellow-700' },
  finished: { label: 'Завершён', color: 'bg-gray-200 text-gray-600' },
};

export function CitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [now, setNow] = useState(new Date());

  const fetchCities = () => {
    api.get<City[]>('/api/cities').then(setCities).catch(console.error);
  };

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
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

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post<{
        synced: number;
        cities: number;
        failed: { cityName: string }[];
      }>('/api/admin/sync-sheets', {});
      const failed = res.failed.map((f) => f.cityName).join(', ');
      toast.success(
        `Города: ${res.cities}, строк: ${res.synced}` +
          (failed ? `. Ошибки: ${failed}` : ''),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка синхронизации');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Города</h1>
          <p className="text-sm text-gray-500 mt-1">{cities.length} городов</p>
        </div>
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={syncing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Синхронизация...' : 'Sync Google Sheets'}
        </Button>
      </div>

      <div className="grid gap-4">
        {cities.map((city) => {
          const status =
            STATUS_STYLES[city.timerStatus] ?? STATUS_STYLES.pending;
          return (
            <Link
              key={city.id}
              to={`/admin/cities/${city.id}`}
              className="bg-white rounded-xl border border-[var(--tinkoff-border)] p-5 hover:shadow-md transition-shadow flex items-center justify-between"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 bg-[var(--tinkoff-yellow)]/20 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-lg truncate">
                    {city.name}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {getCityTime(city.timezone)}
                    </span>
                    <span>{city.durationMin} мин</span>
                    <span className="truncate">
                      {city.sheetId ? (
                        <span className="text-green-600">
                          sheet: {city.sheetId.slice(0, 8)}…
                        </span>
                      ) : (
                        <span className="text-red-500">sheet не привязан</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge className={status.color}>{status.label}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(`/public/leaderboard/${city.id}`, '_blank');
                  }}
                  title="Открыть лидерборд в новой вкладке"
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
            <p>Нет городов.</p>
          </div>
        )}
      </div>

      <div className="mt-8 text-xs text-gray-400 text-center">
        <a
          href="https://sheets.googleapis.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-gray-600"
        >
          <ExternalLink className="w-3 h-3" />
          Google Sheets API
        </a>
      </div>
    </div>
  );
}
