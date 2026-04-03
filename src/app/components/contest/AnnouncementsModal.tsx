import { useState, useEffect, useRef, useCallback } from 'react';
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
import { api } from '@/lib/api';
import type { Announcement } from '@shared/types';

interface AnnouncementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityId: string;
}

function playNotificationBeep() {
  try {
    const ctx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not available — silently ignore
  }
}

function showBrowserNotification(announcement: Announcement) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  new Notification(announcement.title, {
    body: announcement.message,
    icon: '/favicon.ico',
  });
}

export function AnnouncementsModal({
  isOpen,
  onClose,
  cityId,
}: AnnouncementsModalProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filter, setFilter] = useState<'all' | 'important'>('all');
  const knownIdsRef = useRef<Set<string>>(new Set());
  const isFirstPollRef = useRef(true);

  // Request notification permission when the modal first opens
  useEffect(() => {
    if (!isOpen) return;
    if (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission().catch(console.error);
    }
  }, [isOpen]);

  const handleNewAnnouncements = useCallback((data: Announcement[]) => {
    if (isFirstPollRef.current) {
      // On first poll, seed the known IDs without triggering notifications
      knownIdsRef.current = new Set(data.map((a) => a.id));
      isFirstPollRef.current = false;
    } else {
      const newAnnouncements = data.filter(
        (a) => a.isNew && !knownIdsRef.current.has(a.id),
      );
      if (newAnnouncements.length > 0) {
        playNotificationBeep();
        newAnnouncements.forEach(showBrowserNotification);
      }
      // Update known IDs with all current announcement IDs
      knownIdsRef.current = new Set(data.map((a) => a.id));
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    api
      .get<Announcement[]>(`/api/cities/${cityId}/announcements`)
      .then((data) => {
        handleNewAnnouncements(data);
        setAnnouncements(data);

        // Mark unread announcements as read
        const unreadIds = data.filter((a) => a.isNew).map((a) => a.id);
        if (unreadIds.length > 0) {
          api
            .post(`/api/cities/${cityId}/announcements/read`, {
              ids: unreadIds,
            })
            .catch(console.error);
        }
      })
      .catch(console.error);
  }, [isOpen, cityId, handleNewAnnouncements]);

  const filteredAnnouncements =
    filter === 'important'
      ? announcements.filter((a) => a.important)
      : announcements;

  const importantCount = announcements.filter((a) => a.important).length;
  const newCount = announcements.filter((a) => a.isNew).length;

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
              Все ({announcements.length})
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
