import { Check, Star, Camera, Droplet, Coffee } from 'lucide-react';
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
  const getIcon = (type: ZoneData['type']) => {
    switch (type) {
      case 'task':
        return <Star className="w-5 h-5" />;
      case 'side-quest':
        return <Star className="w-5 h-5 text-amber-500" />;
      case 'photo':
        return <Camera className="w-5 h-5 text-purple-500" />;
      case 'water':
        return <Droplet className="w-5 h-5 text-blue-500" />;
      case 'snack':
        return <Coffee className="w-5 h-5 text-orange-500" />;
    }
  };

  const getDifficultyBadge = (difficulty?: ZoneData['difficulty']) => {
    switch (difficulty) {
      case 'easy':
        return (
          <Badge className="bg-green-100 text-green-800 text-xs">Легко</Badge>
        );
      case 'medium':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 text-xs">
            Средне
          </Badge>
        );
      case 'hard':
        return (
          <Badge className="bg-red-100 text-red-800 text-xs">Сложно</Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[var(--tinkoff-gray)]">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {zones.map((zone) => (
          <button
            key={zone.id}
            onClick={() => onZoneClick?.(zone)}
            className={`text-left p-5 rounded-2xl border-2 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
              selectedZoneId === zone.id
                ? 'border-[var(--tinkoff-yellow)] bg-[var(--tinkoff-yellow)]/10 shadow-lg'
                : zone.completed
                  ? 'border-green-300 bg-green-50'
                  : 'border-[var(--tinkoff-border)] bg-white hover:border-[var(--tinkoff-yellow)]'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getIcon(zone.type)}
                {zone.completed && <Check className="w-4 h-4 text-green-600" />}
              </div>
              {getDifficultyBadge(zone.difficulty)}
            </div>

            <h3 className="font-semibold text-sm mb-1 line-clamp-2">
              {zone.name}
            </h3>

            {zone.description && (
              <p className="text-xs text-gray-500 line-clamp-2">
                {zone.description}
              </p>
            )}

            {zone.completed && (
              <div className="mt-2">
                <Badge className="bg-green-100 text-green-800 text-xs">
                  Выполнено
                </Badge>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
