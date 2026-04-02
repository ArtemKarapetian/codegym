import { Check, Code, Dumbbell } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import type { ZoneData } from '@shared/types';

interface ZoneGridProps {
  zones: ZoneData[];
  onZoneClick?: (zone: ZoneData) => void;
  selectedZoneId?: string | null;
}

export function ZoneGrid({
  zones,
  onZoneClick,
  selectedZoneId,
}: ZoneGridProps) {
  const tasks = zones
    .filter((z) => z.type === 'task' && z.problemLetter)
    .sort((a, b) =>
      (a.problemLetter ?? '').localeCompare(b.problemLetter ?? ''),
    );

  // Exercises in fixed order (by sortOrder)
  const exercises = zones
    .filter((z) => z.type === 'task' && z.exercise)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const diffColors: Record<string, string> = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
  };

  const diffLabels: Record<string, string> = {
    easy: 'Легко',
    medium: 'Средне',
    hard: 'Сложно',
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--tinkoff-gray)] pl-20 lg:pl-24 pr-4 sm:pr-6 py-4 sm:py-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Tasks — any order */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Code className="w-5 h-5 text-[var(--tinkoff-dark-gray)]" />
            <h2 className="text-lg font-bold">Задачи</h2>
            <span className="text-sm text-gray-400">
              (решайте в любом порядке)
            </span>
          </div>

          <div className="space-y-2">
            {tasks.map((zone) => (
              <button
                key={zone.id}
                onClick={() => onZoneClick?.(zone)}
                className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-150 hover:shadow-md ${
                  selectedZoneId === zone.id
                    ? 'border-[var(--tinkoff-yellow)] bg-[var(--tinkoff-yellow)]/10'
                    : zone.completed
                      ? 'border-green-300 bg-green-50'
                      : 'border-[var(--tinkoff-border)] bg-white hover:border-[var(--tinkoff-yellow)]'
                }`}
              >
                {/* Letter badge */}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shrink-0 ${
                    zone.completed
                      ? 'bg-green-500 text-white'
                      : 'bg-[var(--tinkoff-yellow)] text-black'
                  }`}
                >
                  {zone.completed ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    zone.problemLetter
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{zone.name}</p>
                  {zone.description && (
                    <p className="text-xs text-gray-500 truncate">
                      {zone.description}
                    </p>
                  )}
                </div>

                {/* Difficulty */}
                {zone.difficulty && (
                  <Badge
                    className={`shrink-0 text-xs ${diffColors[zone.difficulty]}`}
                  >
                    {diffLabels[zone.difficulty]}
                  </Badge>
                )}

                {/* Status */}
                {zone.completed && (
                  <Badge className="shrink-0 bg-green-100 text-green-700 text-xs">
                    Сдано
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Exercises — fixed order */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Dumbbell className="w-5 h-5 text-[var(--tinkoff-dark-gray)]" />
            <h2 className="text-lg font-bold">Упражнения</h2>
            <span className="text-sm text-gray-400">
              (выполняйте по порядку)
            </span>
          </div>

          <div className="space-y-2">
            {exercises.map((zone, index) => (
              <div
                key={zone.id}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 ${
                  zone.completed
                    ? 'border-green-300 bg-green-50'
                    : 'border-[var(--tinkoff-border)] bg-white'
                }`}
              >
                {/* Order number */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    zone.completed
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {zone.completed ? <Check className="w-5 h-5" /> : index + 1}
                </div>

                {/* Exercise name */}
                <div className="flex-1">
                  <p
                    className={`font-medium text-sm ${zone.completed ? 'line-through text-gray-400' : ''}`}
                  >
                    {zone.exercise}
                  </p>
                  <p className="text-xs text-gray-400">
                    После задачи {zone.problemLetter}
                  </p>
                </div>

                {zone.completed && (
                  <Badge className="shrink-0 bg-green-100 text-green-700 text-xs">
                    Выполнено
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
