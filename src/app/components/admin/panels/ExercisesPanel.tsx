import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface ExerciseItem {
  number: number;
  name: string;
  description: string | null;
  isOverride: boolean;
}

interface ExercisesPanelProps {
  cityId: string;
}

export function ExercisesPanel({ cityId }: ExercisesPanelProps) {
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [dirty, setDirty] = useState(false);

  const fetchExercises = () => {
    api
      .get<ExerciseItem[]>(`/api/cities/${cityId}/exercises`)
      .then((data) => {
        setExercises(data);
        setDirty(false);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchExercises();
  }, [cityId]);

  const update = (
    num: number,
    field: 'name' | 'description',
    value: string,
  ) => {
    setExercises((prev) =>
      prev.map((e) => (e.number === num ? { ...e, [field]: value } : e)),
    );
    setDirty(true);
  };

  const save = async () => {
    await api.put(
      `/api/cities/${cityId}/exercises`,
      exercises.map((e) => ({
        number: e.number,
        name: e.name,
        description: e.description,
      })),
    );
    toast.success('Упражнения сохранены');
    setDirty(false);
    fetchExercises();
  };

  const revertToBase = async (num: number) => {
    await api.delete(`/api/cities/${cityId}/exercises/${num}`);
    toast.success(`Упражнение ${num} сброшено к базовому`);
    fetchExercises();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          9 упражнений. Серые — из базового набора, изменённые выделены.
        </p>
        <Button onClick={save} disabled={!dirty} size="sm">
          Сохранить
        </Button>
      </div>

      <div className="space-y-2">
        {exercises.map((ex) => (
          <div
            key={ex.number}
            className={`bg-white rounded-lg border p-3 flex items-center gap-3 ${
              ex.isOverride
                ? 'border-purple-300 bg-purple-50/30'
                : 'border-[var(--tinkoff-border)]'
            }`}
          >
            <span className="w-6 text-center font-mono font-bold text-gray-400">
              {ex.number}
            </span>
            <Input
              value={ex.name}
              onChange={(e) => update(ex.number, 'name', e.target.value)}
              className="flex-1 h-8 text-sm"
              placeholder="Название упражнения"
            />
            <Input
              value={ex.description ?? ''}
              onChange={(e) => update(ex.number, 'description', e.target.value)}
              className="flex-1 h-8 text-sm"
              placeholder="Описание (необязательно)"
            />
            {ex.isOverride && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => revertToBase(ex.number)}
                title="Сбросить к базовому"
                className="shrink-0"
              >
                <RotateCcw className="w-4 h-4 text-gray-400" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
