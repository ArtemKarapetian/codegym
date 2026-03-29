import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { api } from '@/lib/api';
import type { ZoneData } from '@shared/types';

interface ZonesPanelProps {
  cityId: string;
}

const typeLabels: Record<string, string> = {
  task: 'Задача',
  'side-quest': 'Сайд-квест',
  photo: 'Фото',
  water: 'Вода',
  snack: 'Питание',
};

const diffLabels: Record<string, { label: string; color: string }> = {
  easy: { label: 'Легко', color: 'bg-green-100 text-green-700' },
  medium: { label: 'Средне', color: 'bg-yellow-100 text-yellow-700' },
  hard: { label: 'Сложно', color: 'bg-red-100 text-red-700' },
};

export function ZonesPanel({ cityId }: ZonesPanelProps) {
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [editZone, setEditZone] = useState<ZoneData | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchZones = useCallback(() => {
    api
      .get<ZoneData[]>(`/api/cities/${cityId}/zones`)
      .then(setZones)
      .catch(console.error);
  }, [cityId]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить зону?')) return;
    await api.delete(`/api/cities/${cityId}/zones/${id}`);
    fetchZones();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{zones.length} зон</p>
        <Button
          onClick={() => {
            setEditZone(null);
            setShowForm(true);
          }}
          size="sm"
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Добавить
        </Button>
      </div>

      <div className="space-y-2">
        {zones.map((zone) => (
          <div
            key={zone.id}
            className="bg-white rounded-lg border border-[var(--tinkoff-border)] p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-sm">{zone.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {typeLabels[zone.type] || zone.type}
                  </Badge>
                  {zone.difficulty && diffLabels[zone.difficulty] && (
                    <Badge
                      className={`text-xs ${diffLabels[zone.difficulty].color}`}
                    >
                      {diffLabels[zone.difficulty].label}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditZone(zone);
                  setShowForm(true);
                }}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(zone.id)}
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ZoneFormDialog
        key={editZone?.id ?? 'new'}
        open={showForm}
        onClose={() => setShowForm(false)}
        cityId={cityId}
        zone={editZone}
        onSaved={fetchZones}
      />
    </div>
  );
}

function ZoneFormDialog({
  open,
  onClose,
  cityId,
  zone,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  cityId: string;
  zone: ZoneData | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(zone?.name ?? '');
  const [type, setType] = useState<string>(zone?.type ?? 'task');
  const [difficulty, setDifficulty] = useState<string>(zone?.difficulty ?? '');
  const [description, setDescription] = useState(zone?.description ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      name,
      type,
      difficulty: difficulty || undefined,
      description: description || undefined,
    };

    if (zone) {
      await api.put(`/api/cities/${cityId}/zones/${zone.id}`, body);
    } else {
      await api.post(`/api/cities/${cityId}/zones`, body);
    }

    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {zone ? 'Редактировать зону' : 'Новая зона'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Название</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Тип</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="task">Задача</SelectItem>
                <SelectItem value="side-quest">Сайд-квест</SelectItem>
                <SelectItem value="photo">Фото</SelectItem>
                <SelectItem value="water">Вода</SelectItem>
                <SelectItem value="snack">Питание</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Сложность</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="Без сложности" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Легко</SelectItem>
                <SelectItem value="medium">Средне</SelectItem>
                <SelectItem value="hard">Сложно</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Описание</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <Button type="submit" className="w-full">
            {zone ? 'Сохранить' : 'Создать'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
