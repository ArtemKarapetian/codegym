import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { api } from '@/lib/api';
import type { Announcement } from '@shared/types';

interface AnnouncementsPanelProps {
  cityId: string;
}

export function AnnouncementsPanel({ cityId }: AnnouncementsPanelProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const fetchAnnouncements = () => {
    api
      .get<Announcement[]>(`/api/cities/${cityId}/announcements`)
      .then(setAnnouncements)
      .catch(console.error);
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [cityId]);

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить объявление?')) return;
    await api.delete(`/api/cities/${cityId}/announcements/${id}`);
    fetchAnnouncements();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {announcements.length} объявлений
        </p>
        <Button onClick={() => setShowCreate(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Новое
        </Button>
      </div>

      <div className="space-y-2">
        {announcements.map((a) => (
          <div
            key={a.id}
            className={`bg-white rounded-lg border p-4 flex items-start justify-between ${
              a.important
                ? 'border-[var(--tinkoff-yellow)]'
                : 'border-[var(--tinkoff-border)]'
            }`}
          >
            <div className="flex items-start gap-3">
              {a.important ? (
                <AlertCircle className="w-5 h-5 text-[var(--tinkoff-yellow)] mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-gray-400 mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{a.title}</span>
                  {a.important && (
                    <Badge className="bg-[var(--tinkoff-yellow)] text-black text-xs">
                      Важное
                    </Badge>
                  )}
                  <span className="text-xs text-gray-400">{a.timestamp}</span>
                </div>
                <p className="text-sm text-gray-600">{a.message}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(a.id)}
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="p-8 text-center text-gray-400 text-sm">
            Нет объявлений
          </div>
        )}
      </div>

      <CreateAnnouncementDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        cityId={cityId}
        onCreated={fetchAnnouncements}
      />
    </div>
  );
}

function CreateAnnouncementDialog({
  open,
  onClose,
  cityId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  cityId: string;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [important, setImportant] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post(`/api/cities/${cityId}/announcements`, {
      title,
      message,
      important,
    });
    onCreated();
    onClose();
    setTitle('');
    setMessage('');
    setImportant(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новое объявление</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Заголовок</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Сообщение</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="important"
              checked={important}
              onChange={(e) => setImportant(e.target.checked)}
            />
            <Label htmlFor="important">Важное объявление</Label>
          </div>
          <Button type="submit" className="w-full">
            Опубликовать
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
