import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, FileSpreadsheet, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/app/components/ui/badge';
import { api } from '@/lib/api';
import type { City } from '@shared/types';
import type { TrainerGradesResponse, TrainerExerciseItem } from '@shared/api';

export function TrainerGradePage() {
  const { cityId, teamId } = useParams<{ cityId: string; teamId: string }>();
  const [city, setCity] = useState<City | null>(null);
  const [data, setData] = useState<TrainerGradesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingExercise, setSavingExercise] = useState<number | null>(null);

  useEffect(() => {
    if (!cityId || !teamId) return;
    let cancelled = false;
    Promise.all([
      api.get<City>(`/api/cities/${cityId}`),
      api.get<TrainerGradesResponse>(
        `/api/trainer/cities/${cityId}/teams/${teamId}/grades`,
      ),
    ])
      .then(([c, d]) => {
        if (cancelled) return;
        setCity(c);
        setData(d);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) toast.error('Не удалось загрузить упражнения');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cityId, teamId]);

  const handleToggle = async (ex: TrainerExerciseItem) => {
    if (!cityId || !teamId || !data) return;
    const next = !ex.completed;
    setSavingExercise(ex.number);

    // Optimistic update
    setData({
      ...data,
      exercises: data.exercises.map((e) =>
        e.number === ex.number
          ? { ...e, completed: next, source: next ? 'trainer' : null }
          : e,
      ),
    });

    try {
      const res = await api.post<TrainerGradesResponse>(
        `/api/trainer/cities/${cityId}/teams/${teamId}/grades`,
        { exerciseNumber: ex.number, completed: next },
      );
      setData(res);
      toast.success(
        next
          ? `Упражнение ${ex.number} зачтено`
          : `Упражнение ${ex.number} снято`,
      );
    } catch (err) {
      console.error(err);
      toast.error('Не удалось сохранить');
      // Rollback
      setData((prev) =>
        prev
          ? {
              ...prev,
              exercises: prev.exercises.map((e) =>
                e.number === ex.number ? ex : e,
              ),
            }
          : prev,
      );
    } finally {
      setSavingExercise(null);
    }
  };

  const completedCount = data?.exercises.filter((e) => e.completed).length ?? 0;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Link
          to={`/trainer/cities/${cityId}`}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold truncate">
            {data?.team.teamName ?? data?.team.login ?? '...'}
          </h1>
          <p className="text-sm text-gray-500 truncate">
            {city?.name} {data?.team.login ? `· ${data.team.login}` : ''}
          </p>
        </div>
        {data && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-2xl font-bold text-[var(--tinkoff-yellow)]">
              {completedCount}
            </span>
            <span className="text-gray-400">/</span>
            <span className="text-gray-500">{data.exercises.length}</span>
          </div>
        )}
      </div>

      {loading || !data ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-4 border-[var(--tinkoff-yellow)] border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-2">
          {data.exercises.map((ex) => (
            <button
              key={ex.number}
              type="button"
              disabled={savingExercise === ex.number}
              onClick={() => handleToggle(ex)}
              className={`w-full text-left flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                ex.completed
                  ? 'bg-green-50 border-green-300'
                  : 'bg-white border-[var(--tinkoff-border)] hover:border-[var(--tinkoff-yellow)]'
              } ${savingExercise === ex.number ? 'opacity-60' : ''}`}
            >
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm shrink-0 ${
                  ex.completed
                    ? 'bg-green-500 text-white'
                    : 'bg-[var(--tinkoff-yellow)]/20'
                }`}
              >
                {ex.completed ? <Check className="w-5 h-5" /> : ex.number}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`font-medium text-sm ${
                    ex.completed ? 'text-green-900' : 'text-gray-900'
                  }`}
                >
                  {ex.name}
                </p>
                {ex.description && (
                  <p className="text-xs text-gray-500 truncate">
                    {ex.description}
                  </p>
                )}
              </div>
              {ex.source === 'trainer' && (
                <Badge className="bg-purple-100 text-purple-700 gap-1 shrink-0">
                  <GraduationCap className="w-3 h-3" />
                  Тренер
                </Badge>
              )}
              {ex.source === 'sheet' && (
                <Badge className="bg-blue-100 text-blue-700 gap-1 shrink-0">
                  <FileSpreadsheet className="w-3 h-3" />
                  Sheets
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-gray-400 text-center">
        Нажмите на упражнение, чтобы зачесть или снять. Изменения попадают в
        Google Sheets и обновляют лидерборд автоматически.
      </p>
    </div>
  );
}
