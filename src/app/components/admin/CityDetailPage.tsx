import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import { toast } from 'sonner';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs';
import { api } from '@/lib/api';
import { TimerPanel } from './panels/TimerPanel';
import { ZonesPanel } from './panels/ZonesPanel';
import { TeamsPanel } from './panels/TeamsPanel';
import { AnnouncementsPanel } from './panels/AnnouncementsPanel';
import { ExercisesPanel } from './panels/ExercisesPanel';
import type { City } from '@shared/types';

export function CityDetailPage() {
  const { cityId } = useParams<{ cityId: string }>();
  const [city, setCity] = useState<City | null>(null);

  useEffect(() => {
    if (!cityId) return;
    api.get<City>(`/api/cities/${cityId}`).then(setCity).catch(console.error);
  }, [cityId]);

  if (!city) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--tinkoff-yellow)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/admin"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">{city.name}</h1>
        <span className="text-sm text-gray-500">{city.timezone}</span>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Ссылка на чат города"
              defaultValue={city.chatUrl ?? ''}
              className="w-52 h-8 text-sm"
              onBlur={async (e) => {
                const val = e.target.value.trim() || null;
                if (val !== city.chatUrl) {
                  await api.put(`/api/cities/${city.id}`, { chatUrl: val });
                  setCity({ ...city, chatUrl: val });
                  toast.success('Ссылка на чат обновлена');
                }
              }}
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="timer">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="timer">Таймер</TabsTrigger>
          <TabsTrigger value="exercises">Упражнения</TabsTrigger>
          <TabsTrigger value="teams">Команды</TabsTrigger>
          <TabsTrigger value="announcements">Объявления</TabsTrigger>
          <TabsTrigger value="zones">Зоны</TabsTrigger>
        </TabsList>

        <TabsContent value="timer" className="mt-6">
          <TimerPanel cityId={city.id} />
        </TabsContent>

        <TabsContent value="exercises" className="mt-6">
          <ExercisesPanel cityId={city.id} />
        </TabsContent>

        <TabsContent value="zones" className="mt-6">
          <ZonesPanel cityId={city.id} />
        </TabsContent>

        <TabsContent value="teams" className="mt-6">
          <TeamsPanel cityId={city.id} />
        </TabsContent>

        <TabsContent value="announcements" className="mt-6">
          <AnnouncementsPanel cityId={city.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
