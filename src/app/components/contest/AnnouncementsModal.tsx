import { useState } from 'react';
import { Bell, AlertCircle, Info } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs';

interface Announcement {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  important: boolean;
  isNew: boolean;
}

interface AnnouncementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const mockAnnouncements: Announcement[] = [
  {
    id: '1',
    title: 'Контест начался!',
    message:
      'Добро пожаловать на Code Gym × T-Bank! Контест продлится 3 часа. Желаем удачи всем участникам!',
    timestamp: '10:00',
    important: true,
    isNew: true,
  },
  {
    id: '2',
    title: 'Обеденный перерыв',
    message:
      'С 13:00 до 13:30 будет организован обеденный перерыв. Зона питания на 2 этаже.',
    timestamp: '09:45',
    important: true,
    isNew: false,
  },
  {
    id: '3',
    title: 'Бонусное задание',
    message:
      'Открыт сайд-квест в Photo Zone! Сделайте креативное фото команды и получите +50 баллов.',
    timestamp: '09:30',
    important: false,
    isNew: false,
  },
  {
    id: '4',
    title: 'WiFi информация',
    message: 'Сеть: CodeGym_Contest, Пароль: tbank2026',
    timestamp: '09:00',
    important: false,
    isNew: false,
  },
];

export function AnnouncementsModal({
  isOpen,
  onClose,
}: AnnouncementsModalProps) {
  const [filter, setFilter] = useState<'all' | 'important'>('all');

  const filteredAnnouncements =
    filter === 'important'
      ? mockAnnouncements.filter((a) => a.important)
      : mockAnnouncements;

  const importantCount = mockAnnouncements.filter((a) => a.important).length;
  const newCount = mockAnnouncements.filter((a) => a.isNew).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Объявления
            {newCount > 0 && (
              <Badge className="bg-red-500 text-white ml-2">
                {newCount} новых
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Важные обновления и информация от организаторов
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="all"
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all" onClick={() => setFilter('all')}>
              Все ({mockAnnouncements.length})
            </TabsTrigger>
            <TabsTrigger
              value="important"
              onClick={() => setFilter('important')}
            >
              Важное ({importantCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="flex-1 overflow-y-auto mt-4">
            <AnnouncementsList announcements={filteredAnnouncements} />
          </TabsContent>

          <TabsContent
            value="important"
            className="flex-1 overflow-y-auto mt-4"
          >
            <AnnouncementsList announcements={filteredAnnouncements} />
          </TabsContent>
        </Tabs>

        {filteredAnnouncements.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Bell className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">Пока нет объявлений</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AnnouncementsList({
  announcements,
}: {
  announcements: Announcement[];
}) {
  return (
    <div className="space-y-3 pr-2">
      {announcements.map((announcement) => (
        <div
          key={announcement.id}
          className={`p-4 rounded-xl border-2 transition-all ${
            announcement.important
              ? 'bg-[var(--tinkoff-yellow)]/10 border-[var(--tinkoff-yellow)]'
              : 'bg-[var(--tinkoff-gray)] border-transparent'
          }`}
        >
          <div className="flex items-start gap-3">
            {announcement.important ? (
              <AlertCircle className="w-5 h-5 text-[var(--tinkoff-yellow)] flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-semibold flex items-center gap-2">
                  {announcement.title}
                  {announcement.isNew && (
                    <Badge className="bg-red-500 text-white text-xs">NEW</Badge>
                  )}
                </h4>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {announcement.timestamp}
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {announcement.message}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
