import { useState, useEffect, useCallback } from 'react';
import { Header } from './Header';
import { Toolbox } from './Toolbox';
import { MapCanvas } from './MapCanvas';
import { ZoneGrid } from './ZoneGrid';
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

  // Fetch city info
  useEffect(() => {
    api
      .get<City>(`/api/cities/${cityId}`)
      .then(setCity)
      .catch(console.error)
      .finally(() => setLoading(false));
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

      <div className="flex-1 relative min-h-0">
        {mapEnabled ? (
          <MapCanvas
            zones={zones}
            onZoneClick={handleZoneClick}
            selectedZoneId={selectedZone?.id}
          />
        ) : (
          <ZoneGrid
            zones={zones}
            onZoneClick={handleZoneClick}
            selectedZoneId={selectedZone?.id}
          />
        )}

        <Toolbox
          isMobile={isMobile}
          onRulesClick={() => setShowRules(true)}
          onContactClick={() => setShowContact(true)}
          onAnnouncementsClick={() => setShowAnnouncements(true)}
          onLeaderboardClick={() => setShowLeaderboard(true)}
          onHelpClick={() => setShowRules(true)}
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
