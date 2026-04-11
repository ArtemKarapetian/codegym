import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import type { City } from '@shared/types';

export function TrainerCityPicker() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<City[]>('/api/trainer/cities')
      .then(setCities)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Выберите город</h1>
      <p className="text-sm text-gray-500 mb-6">
        Затем выберите команду, чтобы выставить оценки за упражнения
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-4 border-[var(--tinkoff-yellow)] border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {cities.map((city) => (
            <Link
              key={city.id}
              to={`/trainer/cities/${city.id}`}
              className="bg-white rounded-xl border border-[var(--tinkoff-border)] p-4 hover:shadow-md hover:border-[var(--tinkoff-yellow)] transition-all flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-[var(--tinkoff-yellow)]/20 rounded-lg flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{city.name}</p>
                <p className="text-xs text-gray-500">{city.timezone}</p>
              </div>
            </Link>
          ))}
          {cities.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              Нет городов
            </div>
          )}
        </div>
      )}
    </div>
  );
}
