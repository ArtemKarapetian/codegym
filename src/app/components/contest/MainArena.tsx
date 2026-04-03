import { useState, useEffect, useCallback, useRef } from 'react';
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
import type { ZoneData, TimerState, City, Announcement } from '@shared/types';

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
  const [teamSolved, setTeamSolved] = useState(0);
  const [teamTotal, setTeamTotal] = useState(9);

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

  // Fetch team score from leaderboard
  useEffect(() => {
    api
      .get<{ solved: number; teamName: string }[]>(
        `/api/cities/${cityId}/leaderboard`,
      )
      .then((data) => {
        const me = data.find((t) => t.teamName === teamName);
        if (me) setTeamSolved(me.solved);
        setTeamTotal(9);
      })
      .catch(console.error);

    const interval = setInterval(() => {
      api
        .get<{ solved: number; teamName: string }[]>(
          `/api/cities/${cityId}/leaderboard`,
        )
        .then((data) => {
          const me = data.find((t) => t.teamName === teamName);
          if (me) setTeamSolved(me.solved);
        })
        .catch(console.error);
    }, 30000);
    return () => clearInterval(interval);
  }, [cityId, teamName]);

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

  // Global announcement polling with sound
  const knownAnnouncementIds = useRef<Set<string>>(new Set());
  const isFirstAnnouncementPoll = useRef(true);

  useEffect(() => {
    // Request notification permission
    if (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission().catch(console.error);
    }

    const poll = () => {
      api
        .get<Announcement[]>(`/api/cities/${cityId}/announcements`)
        .then((data) => {
          if (isFirstAnnouncementPoll.current) {
            knownAnnouncementIds.current = new Set(data.map((a) => a.id));
            isFirstAnnouncementPoll.current = false;
            return;
          }
          const newOnes = data.filter(
            (a) => !knownAnnouncementIds.current.has(a.id),
          );
          if (newOnes.length > 0) {
            // Sound — two-tone chime, ~1.5s
            try {
              const ctx = new (
                window.AudioContext ||
                (
                  window as unknown as {
                    webkitAudioContext: typeof AudioContext;
                  }
                ).webkitAudioContext
              )();
              const gain = ctx.createGain();
              gain.connect(ctx.destination);
              gain.gain.setValueAtTime(0.4, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(
                0.001,
                ctx.currentTime + 1.5,
              );

              const o1 = ctx.createOscillator();
              o1.type = 'sine';
              o1.frequency.setValueAtTime(659, ctx.currentTime); // E5
              o1.frequency.setValueAtTime(880, ctx.currentTime + 0.3); // A5
              o1.frequency.setValueAtTime(1047, ctx.currentTime + 0.6); // C6
              o1.connect(gain);
              o1.start(ctx.currentTime);
              o1.stop(ctx.currentTime + 1.5);

              const o2 = ctx.createOscillator();
              o2.type = 'triangle';
              o2.frequency.setValueAtTime(1319, ctx.currentTime + 0.15); // E6
              o2.frequency.setValueAtTime(1760, ctx.currentTime + 0.45); // A6
              const g2 = ctx.createGain();
              g2.gain.setValueAtTime(0.15, ctx.currentTime);
              g2.gain.exponentialRampToValueAtTime(
                0.001,
                ctx.currentTime + 1.2,
              );
              o2.connect(g2);
              g2.connect(ctx.destination);
              o2.start(ctx.currentTime + 0.15);
              o2.stop(ctx.currentTime + 1.2);
            } catch {
              /* ignore */
            }

            // Toast (stays until dismissed) + browser notification
            for (const a of newOnes) {
              toast(a.title, { description: a.message, duration: Infinity });
              if (
                typeof Notification !== 'undefined' &&
                Notification.permission === 'granted'
              ) {
                new Notification(a.title, { body: a.message });
              }
            }
          }
          knownAnnouncementIds.current = new Set(data.map((d) => d.id));
        })
        .catch(console.error);
    };

    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [cityId]);

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
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Упражнения
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-[var(--tinkoff-yellow)]">
                        {teamSolved}
                      </span>
                      <span className="text-gray-400">/</span>
                      <span className="text-gray-500">{teamTotal}</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
                    <div
                      className="h-full bg-[var(--tinkoff-yellow)] rounded-full transition-all duration-500"
                      style={{ width: `${(teamSolved / teamTotal) * 100}%` }}
                    />
                  </div>
                  <div className="space-y-2">
                    {exercises.map((ex) => {
                      const done = ex.number <= teamSolved;
                      return (
                        <div
                          key={ex.number}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                            done
                              ? 'bg-green-50 border-green-200'
                              : ex.number === teamSolved + 1
                                ? 'bg-[var(--tinkoff-yellow)]/10 border-[var(--tinkoff-yellow)] shadow-sm'
                                : 'bg-white border-[var(--tinkoff-border)]'
                          }`}
                        >
                          <span
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm shrink-0 ${
                              done
                                ? 'bg-green-500 text-white'
                                : 'bg-[var(--tinkoff-yellow)]/20'
                            }`}
                          >
                            {done ? '✓' : ex.number}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`font-medium text-sm ${done ? 'text-green-800' : 'text-gray-900'}`}
                            >
                              {ex.name}
                            </p>
                            {ex.description && (
                              <p className="text-xs text-gray-500 truncate">
                                {ex.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
