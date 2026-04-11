import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { api } from '@/lib/api';
import type { City, User } from '@shared/types';

export function TrainerTeamPicker() {
  const { cityId } = useParams<{ cityId: string }>();
  const [city, setCity] = useState<City | null>(null);
  const [teams, setTeams] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!cityId) return;
    let cancelled = false;
    Promise.all([
      api.get<City>(`/api/cities/${cityId}`),
      api.get<User[]>(`/api/trainer/cities/${cityId}/teams`),
    ])
      .then(([c, t]) => {
        if (cancelled) return;
        setCity(c);
        setTeams(t);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cityId]);

  const filtered = query
    ? teams.filter((t) =>
        (t.teamName ?? t.login).toLowerCase().includes(query.toLowerCase()),
      )
    : teams;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Link
          to="/trainer"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{city?.name ?? '...'}</h1>
          <p className="text-sm text-gray-500">Выберите команду</p>
        </div>
      </div>

      <input
        type="text"
        placeholder="Поиск по названию..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full mb-4 px-3 py-2 border border-[var(--tinkoff-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--tinkoff-yellow)]"
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-4 border-[var(--tinkoff-yellow)] border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--tinkoff-border)] divide-y">
          {filtered.map((team) => (
            <Link
              key={team.id}
              to={`/trainer/cities/${cityId}/teams/${team.id}`}
              className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 bg-[var(--tinkoff-gray)] rounded-full flex items-center justify-center text-xs font-semibold">
                {(team.teamName ?? team.login).substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">
                  {team.teamName ?? team.login}
                </p>
                <p className="text-xs text-gray-400 truncate">{team.login}</p>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
              <Users className="w-8 h-8 opacity-30" />
              {teams.length === 0
                ? 'В этом городе пока нет команд'
                : 'Никого не нашлось'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
