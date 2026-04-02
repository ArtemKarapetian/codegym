import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Trophy, Calendar, Users, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import type { City } from '@shared/types';

interface CityWithStats extends City {
  stats: {
    teams: number;
    avgSolved: number;
    maxSolved: number;
    topTeam: string | null;
  } | null;
}

export function CityListPage() {
  const [cities, setCities] = useState<CityWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<CityWithStats[]>('/api/cities/public')
      .then(setCities)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Group cities by contestDate
  const grouped = cities.reduce<Record<string, CityWithStats[]>>(
    (acc, city) => {
      const key = city.contestDate || 'other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(city);
      return acc;
    },
    {},
  );

  // Sort date keys descending (latest first)
  const sortedDates = Object.keys(grouped).sort((a, b) => {
    if (a === 'other') return 1;
    if (b === 'other') return -1;
    return b.localeCompare(a);
  });

  const formatDate = (dateStr: string) => {
    if (dateStr === 'other') return 'Без даты';
    const [y, m, d] = dateStr.split('-').map(Number);
    const months = [
      'января',
      'февраля',
      'марта',
      'апреля',
      'мая',
      'июня',
      'июля',
      'августа',
      'сентября',
      'октября',
      'ноября',
      'декабря',
    ];
    return `${d} ${months[m - 1]} ${y}`;
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-500',
    running: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    finished: 'bg-gray-200 text-gray-600',
  };

  const statusLabel: Record<string, string> = {
    pending: 'Ожидание',
    running: 'Идёт',
    paused: 'Пауза',
    finished: 'Завершён',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--tinkoff-gray)]">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--tinkoff-yellow)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--tinkoff-gray)]">
      {/* Header */}
      <div className="bg-[var(--tinkoff-yellow)] px-6 py-6">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <img src="/logo.png" alt="Код спорта" className="h-5 shrink-0" />
          <div>
            <p className="text-sm text-black/80 font-medium">
              Контест-площадки
            </p>
          </div>
        </div>
      </div>

      {/* City list */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {sortedDates.map((dateKey) => (
          <div key={dateKey} className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">
                {formatDate(dateKey)}
              </h2>
              <span className="text-sm text-gray-600">
                ({grouped[dateKey].length}{' '}
                {grouped[dateKey].length === 1
                  ? 'город'
                  : grouped[dateKey].length < 5
                    ? 'города'
                    : 'городов'}
                )
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped[dateKey]
                .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
                .map((city) => (
                  <Link
                    key={city.id}
                    to={`/public/leaderboard/${city.id}`}
                    className="bg-white rounded-xl border border-[var(--tinkoff-border)] p-4 hover:shadow-md hover:border-[var(--tinkoff-yellow)] transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[var(--tinkoff-yellow)] shrink-0" />
                        <h3 className="font-semibold text-gray-900 group-hover:text-black">
                          {city.name}
                        </h3>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${statusColor[city.timerStatus] || statusColor.pending}`}
                      >
                        {statusLabel[city.timerStatus] || 'Ожидание'}
                      </span>
                    </div>

                    {city.stats ? (
                      <div className="space-y-1.5 mb-2">
                        <div className="flex items-center justify-between text-xs text-gray-700">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {city.stats.teams} команд
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            avg {city.stats.avgSolved} / max{' '}
                            {city.stats.maxSolved}
                          </span>
                        </div>
                        {city.stats.topTeam && (
                          <div className="text-xs text-gray-600 truncate">
                            <Trophy className="w-3 h-3 inline mr-1 text-[var(--tinkoff-yellow)]" />
                            {city.stats.topTeam}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 mb-2">
                        Нет данных
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-xs text-gray-600 pt-2 border-t border-gray-100">
                      <Trophy className="w-3 h-3" />
                      <span>Лидерборд</span>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        ))}

        {cities.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <MapPin className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">Города пока не добавлены</p>
          </div>
        )}
      </div>
    </div>
  );
}
