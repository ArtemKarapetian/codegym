import { useState } from 'react';
import { Check, Star, Camera, Droplet, Coffee } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';

export interface ZoneData {
  id: string;
  name: string;
  type: 'task' | 'side-quest' | 'photo' | 'water' | 'snack';
  position: { x: number; y: number };
  size: { width: number; height: number };
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  completed?: boolean;
}

interface MapZoneProps {
  zone: ZoneData;
  onClick?: (zone: ZoneData) => void;
  onHover?: (zone: ZoneData | null) => void;
  isSelected?: boolean;
}

export function MapZone({ zone, onClick, onHover, isSelected }: MapZoneProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getZoneIcon = () => {
    switch (zone.type) {
      case 'side-quest':
        return <Star className="w-5 h-5" />;
      case 'photo':
        return <Camera className="w-5 h-5" />;
      case 'water':
        return <Droplet className="w-5 h-5" />;
      case 'snack':
        return <Coffee className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getZoneColor = () => {
    if (zone.completed) return 'var(--zone-completed)';
    if (isSelected) return 'var(--zone-selected)';
    if (isHovered) return 'var(--zone-hover)';

    // Different backgrounds for different zone types
    switch (zone.type) {
      case 'side-quest':
        return isHovered ? 'var(--zone-hover)' : 'var(--zone-side-bg)';
      case 'photo':
      case 'water':
      case 'snack':
        return isHovered ? 'var(--zone-hover)' : 'var(--zone-facility-bg)';
      default:
        return 'var(--zone-task-bg)';
    }
  };

  const getDifficultyColor = () => {
    switch (zone.difficulty) {
      case 'easy':
        return '#10B981';
      case 'medium':
        return '#F59E0B';
      case 'hard':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div
            className="map-zone absolute transition-all duration-300 cursor-pointer group"
            style={{
              left: `${zone.position.x}px`,
              top: `${zone.position.y}px`,
              width: `${zone.size.width}px`,
              height: `${zone.size.height}px`,
            }}
            onClick={() => onClick?.(zone)}
            onMouseEnter={() => {
              setIsHovered(true);
              if (onHover) onHover(zone);
            }}
            onMouseLeave={() => {
              setIsHovered(false);
              if (onHover) onHover(null);
            }}
          >
            {/* Zone background */}
            <div
              className="w-full h-full rounded-2xl border-2 flex flex-col items-center justify-center p-4 transition-all duration-300 hover:shadow-2xl"
              style={{
                backgroundColor: getZoneColor(),
                borderColor: isSelected
                  ? 'var(--tinkoff-black)'
                  : isHovered
                    ? 'var(--tinkoff-yellow)'
                    : 'var(--tinkoff-border)',
                transform:
                  isHovered || isSelected
                    ? 'scale(1.05) translateY(-4px)'
                    : 'scale(1)',
                boxShadow:
                  isHovered || isSelected
                    ? '0 20px 40px rgba(0,0,0,0.15), 0 0 0 3px rgba(255,221,45,0.3)'
                    : '0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              {/* Completed badge */}
              {zone.completed && (
                <div className="absolute top-2 right-2 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Zone icon */}
              <div className="mb-2 opacity-60 transition-all duration-300 group-hover:opacity-100 group-hover:scale-110">
                {getZoneIcon()}
              </div>

              {/* Zone name */}
              <div className="text-center text-sm font-medium line-clamp-2 transition-all duration-300">
                {zone.name}
              </div>

              {/* Difficulty indicator */}
              {zone.difficulty && (
                <div
                  className="mt-2 w-8 h-1 rounded-full transition-all duration-300 group-hover:w-12"
                  style={{ backgroundColor: getDifficultyColor() }}
                />
              )}

              {/* Hover indicator */}
              {(isHovered || isSelected) && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs bg-black text-white px-2 py-1 rounded whitespace-nowrap animate-in fade-in slide-in-from-top-2 duration-200">
                  Клик для открытия
                </div>
              )}

              {/* Glow effect on hover */}
              {(isHovered || isSelected) && (
                <div
                  className="absolute inset-0 rounded-2xl opacity-20 blur-xl -z-10"
                  style={{ backgroundColor: 'var(--tinkoff-yellow)' }}
                />
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-medium">{zone.name}</p>
            {zone.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {zone.description}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
