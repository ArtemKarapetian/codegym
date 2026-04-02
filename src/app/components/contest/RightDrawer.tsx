import { X, ExternalLink, MapPin } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { ZoneData } from './MapZone';

interface RightDrawerProps {
  zone: ZoneData | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenInEjudge?: (zone: ZoneData) => void;
  isMobile?: boolean;
}

export function RightDrawer({
  zone,
  isOpen,
  onClose,
  onOpenInEjudge: _onOpenInEjudge,
  isMobile = false,
}: RightDrawerProps) {
  if (!zone) return null;

  const drawerClasses = isMobile
    ? `fixed inset-x-0 bottom-0 bg-white border-t-2 border-[var(--tinkoff-border)] rounded-t-3xl z-50 transition-transform duration-300 ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`
    : `fixed top-0 right-0 h-full w-full sm:w-[400px] lg:w-[480px] bg-white border-l-2 border-[var(--tinkoff-border)] z-50 transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`;

  const getDifficultyLabel = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy':
        return { label: 'Легко', color: 'bg-green-100 text-green-800' };
      case 'medium':
        return { label: 'Средне', color: 'bg-yellow-100 text-yellow-800' };
      case 'hard':
        return { label: 'Сложно', color: 'bg-red-100 text-red-800' };
      default:
        return null;
    }
  };

  const difficultyBadge = zone.difficulty
    ? getDifficultyLabel(zone.difficulty)
    : null;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={drawerClasses}>
        {/* Mobile handle */}
        {isMobile && (
          <div className="flex justify-center pt-2 pb-4">
            <div className="w-12 h-1 bg-gray-300 rounded-full" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[var(--tinkoff-border)]">
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-1">{zone.name}</h2>
            <p className="text-sm text-[var(--tinkoff-dark-gray)]">
              {zone.type === 'task' ? 'Зона задач' : 'Дополнительная зона'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh] sm:max-h-[calc(100vh-200px)]">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {difficultyBadge && (
              <Badge className={difficultyBadge.color}>
                {difficultyBadge.label}
              </Badge>
            )}
            {zone.completed && (
              <Badge className="bg-green-100 text-green-800">Выполнено</Badge>
            )}
            <Badge variant="outline">{zone.type}</Badge>
          </div>

          {/* Description */}
          {zone.description && (
            <div>
              <h3 className="text-sm font-medium mb-2">Описание</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {zone.description}
              </p>
            </div>
          )}

          {/* Task specific info */}
          {zone.type === 'task' && (
            <div className="bg-[var(--tinkoff-gray)] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[var(--tinkoff-dark-gray)]">Время:</span>
                <span className="font-medium">~30-45 минут</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[var(--tinkoff-dark-gray)]">
                  Оборудование:
                </span>
                <span className="font-medium">Компьютер + редактор</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[var(--tinkoff-dark-gray)]">
                  Упражнение:
                </span>
                <span className="font-medium">Физическая активность</span>
              </div>
            </div>
          )}

          {/* Side quest info */}
          {zone.type === 'side-quest' && (
            <div className="bg-[var(--tinkoff-yellow)]/10 border border-[var(--tinkoff-yellow)]/30 rounded-xl p-4">
              <p className="text-sm">
                💫 Дополнительное задание для получения бонусных баллов!
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-[var(--tinkoff-border)] space-y-3">
          {zone.type === 'task' && (
            <div className="bg-[var(--tinkoff-gray)] rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 mb-2">
                Ссылка на задачи будет доступна позже
              </p>
              <Button
                className="w-full bg-[var(--tinkoff-yellow)] hover:bg-[var(--tinkoff-yellow)]/90 text-black font-medium opacity-60 cursor-not-allowed"
                disabled
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Перейти к задаче
              </Button>
            </div>
          )}
          <Button variant="outline" className="w-full" onClick={onClose}>
            <MapPin className="w-4 h-4 mr-2" />
            Показать на карте
          </Button>
        </div>
      </div>
    </>
  );
}
