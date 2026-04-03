import { useState, useEffect } from 'react';
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

export function BaseExercisesPage() {
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [dirty, setDirty] = useState(false);

  const fetchExercises = () => {
    api
      .get<ExerciseItem[]>('/api/exercises/base')
      .then((data) => {
        setExercises(data);
        setDirty(false);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchExercises();
  }, []);

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
      '/api/exercises/base',
      exercises.map((e) => ({
        number: e.number,
        name: e.name,
        description: e.description,
      })),
    );
    toast.success('Базовые упражнения сохранены');
    setDirty(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Базовые упражнения</h1>
          <p className="text-sm text-gray-500 mt-1">
            Используются по умолчанию для всех городов. Города могут
            переопределить.
          </p>
        </div>
        <Button onClick={save} disabled={!dirty}>
          Сохранить
        </Button>
      </div>

      <div className="space-y-2">
        {exercises.map((ex) => (
          <div
            key={ex.number}
            className="bg-white rounded-lg border border-[var(--tinkoff-border)] p-3 flex items-center gap-3"
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
              placeholder="Описание"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
