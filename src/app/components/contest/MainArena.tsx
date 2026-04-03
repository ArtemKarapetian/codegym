import { useState, useEffect, useCallback } from 'react';
import { Header } from './Header';
import { Toolbox } from './Toolbox';
import { MapCanvas } from './MapCanvas';
import { RightDrawer } from './RightDrawer';
import { RulesModal } from './RulesModal';
import { ContactModal } from './ContactModal';
import { AnnouncementsModal } from './AnnouncementsModal';
import { LeaderboardModal } from './LeaderboardModal';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { ZoneData, TimerState, City } from '@shared/types';

interface MainArenaProps {
  teamName: string;
  cityId: string;
  onLogout: () => void;
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function MainArena({ teamName, cityId, onLogout }: MainArenaProps) {
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [city, setCity] = useState<City | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('--:--:--');
  const [contestStatus, setContestStatus] = useState<
    'active' | 'pending' | 'completed'
  >('pending');
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<
    { number: number; name: string; description: string | null }[]
  >([]);

  // Fetch city info
  useEffect(() => {
    api
      .get<City>(`/api/cities/${cityId}`)
      .then(setCity)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [cityId]);

  // Fetch exercises
  useEffect(() => {
    fetch(`/api/cities/${cityId}/exercises`)
      .then((r) => r.json())
      .then(setExercises)
      .catch(console.error);
  }, [cityId]);

  // Fetch zones
  const fetchZones = useCallback(() => {
    api
      .get<ZoneData[]>(`/api/cities/${cityId}/zones`)
      .then(setZones)
      .catch(console.error);
  }, [cityId]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  // Poll timer
  useEffect(() => {
    const fetchTimer = () => {
      api
        .get<TimerState>(`/api/cities/${cityId}/timer`)
        .then((timer) => {
          setTimeRemaining(formatTime(timer.remainingSeconds));
          if (timer.status === 'running') setContestStatus('active');
          else if (timer.status === 'finished') setContestStatus('completed');
          else setContestStatus('pending');
        })
        .catch(console.error);
    };

    fetchTimer();
    const interval = setInterval(fetchTimer, 5000);
    return () => clearInterval(interval);
  }, [cityId]);

  // Local timer countdown between polls
  useEffect(() => {
    if (contestStatus !== 'active') return;

    const tick = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === '--:--:--') return prev;
        const parts = prev.split(':').map(Number);
        let total = parts[0] * 3600 + parts[1] * 60 + parts[2] - 1;
        if (total < 0) total = 0;
        return formatTime(total);
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [contestStatus]);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleZoneClick = (zone: ZoneData) => {
    setSelectedZone(zone);
    setIsDrawerOpen(true);
  };

  const handleOpenInEjudge = (_zone: ZoneData) => {
    toast.info('Ссылка на задачи будет доступна позже');
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedZone(null), 300);
  };

  const mapEnabled = city?.mapEnabled ?? true;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--tinkoff-gray)]">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--tinkoff-yellow)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header
        teamName={teamName}
        contestStatus={contestStatus}
        timeRemaining={timeRemaining}
        onLogout={onLogout}
      />

      <div className="flex-1 relative min-h-0 flex flex-col">
        {mapEnabled ? (
          <MapCanvas
            zones={zones}
            onZoneClick={handleZoneClick}
            selectedZoneId={selectedZone?.id}
          />
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Contest link */}
              <a
                href="https://t.me/kod_sporta"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-[var(--tinkoff-border)] shadow-sm hover:shadow-md hover:border-[var(--tinkoff-yellow)] transition-all"
              >
                <div className="w-12 h-12 bg-[var(--tinkoff-yellow)] rounded-xl flex items-center justify-center shrink-0">
                  <svg
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    Перейти к задачам
                  </p>
                  <p className="text-sm text-gray-500">
                    Откроется сайт с контестом
                  </p>
                </div>
              </a>

              {/* Exercises */}
              {exercises.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    Упражнения
                  </h2>
                  <div className="space-y-2">
                    {exercises.map((ex) => (
                      <div
                        key={ex.number}
                        className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[var(--tinkoff-border)]"
                      >
                        <span className="w-8 h-8 bg-[var(--tinkoff-yellow)]/20 rounded-lg flex items-center justify-center font-mono font-bold text-sm shrink-0">
                          {ex.number}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-gray-900">
                            {ex.name}
                          </p>
                          {ex.description && (
                            <p className="text-xs text-gray-500 truncate">
                              {ex.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <Toolbox
          isMobile={isMobile}
          onRulesClick={() => setShowRules(true)}
          onContactClick={() => setShowContact(true)}
          onAnnouncementsClick={() => setShowAnnouncements(true)}
          onLeaderboardClick={() => setShowLeaderboard(true)}
        />

        <RightDrawer
          zone={selectedZone}
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          onOpenInEjudge={handleOpenInEjudge}
          isMobile={isMobile}
        />
      </div>

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <ContactModal
        isOpen={showContact}
        onClose={() => setShowContact(false)}
        chatUrl={city?.chatUrl}
      />
      <AnnouncementsModal
        isOpen={showAnnouncements}
        onClose={() => setShowAnnouncements(false)}
        cityId={cityId}
      />
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        currentTeamName={teamName}
        cityId={cityId}
      />
    </div>
  );
}
