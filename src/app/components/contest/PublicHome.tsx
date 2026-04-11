import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Trophy } from 'lucide-react';
import type { PublicCitiesResponse } from '@shared/api';

export function PublicHome() {
  const [cities, setCities] = useState<PublicCitiesResponse>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cities/public')
      .then((r) => r.json())
      .then((data: PublicCitiesResponse) => setCities(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[var(--tinkoff-gray)] to-[var(--tinkoff-yellow)]/20">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <img src="/logo.png" alt="Код спорта" className="h-10 mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Лидерборды городов
          </h1>
          <p className="text-gray-600 mt-2">
            Выбери город, чтобы посмотреть таблицу результатов
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin w-8 h-8 border-4 border-[var(--tinkoff-yellow)] border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cities.map((city) => (
              <Link
                key={city.id}
                to={`/public/leaderboard/${city.id}`}
                className="group bg-white rounded-2xl border-2 border-[var(--tinkoff-border)] p-5 hover:border-[var(--tinkoff-yellow)] hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-[var(--tinkoff-yellow)]/20 rounded-xl flex items-center justify-center group-hover:bg-[var(--tinkoff-yellow)]/40 transition-colors">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{city.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                      <StatusDot status={city.timerStatus} />
                      <span>{statusLabel(city.timerStatus)}</span>
                    </div>
                  </div>
                  <Trophy className="w-4 h-4 text-gray-300 group-hover:text-[var(--tinkoff-yellow)] transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && cities.length === 0 && (
          <div className="text-center py-24 text-gray-400">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Нет городов.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case 'running':
      return 'Идёт';
    case 'paused':
      return 'Пауза';
    case 'finished':
      return 'Завершён';
    default:
      return 'Ожидание';
  }
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'running'
      ? 'bg-green-500'
      : status === 'paused'
        ? 'bg-yellow-500'
        : status === 'finished'
          ? 'bg-gray-400'
          : 'bg-gray-300';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}
