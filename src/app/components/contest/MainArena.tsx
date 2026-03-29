import { useState, useEffect } from 'react';
import { Header } from './Header';
import { Toolbox } from './Toolbox';
import { MapCanvas } from './MapCanvas';
import { RightDrawer } from './RightDrawer';
import { RulesModal } from './RulesModal';
import { ContactModal } from './ContactModal';
import { AnnouncementsModal } from './AnnouncementsModal';
import { LeaderboardModal } from './LeaderboardModal';
import { ZoneData } from './MapZone';
import { toast } from 'sonner';

interface MainArenaProps {
  teamName: string;
  onLogout: () => void;
}

// Mock zones data
const zones: ZoneData[] = [
  // Task zones (arranged in a circular pattern)
  {
    id: '1',
    name: 'Зона 1: Алгоритмы ↔ Отжимания',
    type: 'task',
    position: { x: 200, y: 100 },
    size: { width: 140, height: 120 },
    description:
      'Решите задачу на поиск и отсортируйте массив, затем выполните 20 отжиманий',
    difficulty: 'easy',
  },
  {
    id: '2',
    name: 'Зона 2: Структуры данных ↔ Приседания',
    type: 'task',
    position: { x: 500, y: 80 },
    size: { width: 140, height: 120 },
    description: 'Реализуйте стек или очередь, затем сделайте 30 приседаний',
    difficulty: 'easy',
  },
  {
    id: '3',
    name: 'Зона 3: Графы ↔ Планка',
    type: 'task',
    position: { x: 800, y: 150 },
    size: { width: 140, height: 120 },
    description:
      'Найдите кратчайший путь в графе и удерживайте планку 60 секунд',
    difficulty: 'medium',
  },
  {
    id: '4',
    name: 'Зона 4: Динамика ↔ Прыжки',
    type: 'task',
    position: { x: 950, y: 350 },
    size: { width: 140, height: 120 },
    description: 'Решите задачу DP и выполните 50 прыжков',
    difficulty: 'hard',
  },
  {
    id: '5',
    name: 'Зона 5: Строки ↔ Берпи',
    type: 'task',
    position: { x: 850, y: 550 },
    size: { width: 140, height: 120 },
    description: 'Обработайте строки и сделайте 15 берпи',
    difficulty: 'medium',
  },
  {
    id: '6',
    name: 'Зона 6: Деревья ↔ Выпады',
    type: 'task',
    position: { x: 550, y: 600 },
    size: { width: 140, height: 120 },
    description: 'Обойдите дерево и выполните 20 выпадов на каждую ногу',
    difficulty: 'hard',
  },
  {
    id: '7',
    name: 'Зона 7: Математика ↔ Скручивания',
    type: 'task',
    position: { x: 250, y: 550 },
    size: { width: 140, height: 120 },
    description: 'Решите математическую задачу и сделайте 40 скручиваний',
    difficulty: 'medium',
  },
  {
    id: '8',
    name: 'Зона 8: Greedy ↔ Бег',
    type: 'task',
    position: { x: 50, y: 400 },
    size: { width: 140, height: 120 },
    description: 'Примените жадный алгоритм и пробегите 400м',
    difficulty: 'easy',
  },
  {
    id: '9',
    name: 'Зона 9: Комбинаторика ↔ Растяжка',
    type: 'task',
    position: { x: 100, y: 250 },
    size: { width: 140, height: 120 },
    description: 'Посчитайте комбинации и сделайте растяжку 5 минут',
    difficulty: 'medium',
  },
  {
    id: '10',
    name: 'Зона 10: Оптимизация ↔ Кардио',
    type: 'task',
    position: { x: 400, y: 350 },
    size: { width: 140, height: 120 },
    description: 'Оптимизируйте решение и выполните кардио-сет',
    difficulty: 'hard',
  },

  // Additional zones
  {
    id: 'side-1',
    name: 'Side Quest: Бонус',
    type: 'side-quest',
    position: { x: 600, y: 300 },
    size: { width: 120, height: 100 },
    description: 'Дополнительное задание для получения бонусных баллов',
  },
  {
    id: 'photo',
    name: 'Фотозона',
    type: 'photo',
    position: { x: 450, y: 150 },
    size: { width: 100, height: 80 },
    description: 'Сделайте креативное фото команды',
  },
  {
    id: 'water',
    name: 'Вода',
    type: 'water',
    position: { x: 700, y: 400 },
    size: { width: 80, height: 80 },
    description: 'Зона отдыха с водой',
  },
  {
    id: 'snack',
    name: 'Питание',
    type: 'snack',
    position: { x: 300, y: 450 },
    size: { width: 80, height: 80 },
    description: 'Легкие закуски и напитки',
  },
];

export function MainArena({ teamName, onLogout }: MainArenaProps) {
  const [selectedZone, setSelectedZone] = useState<ZoneData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('02:45:30');
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const [hours, minutes, seconds] = prev.split(':').map(Number);
        let totalSeconds = hours * 3600 + minutes * 60 + seconds - 1;
        if (totalSeconds < 0) totalSeconds = 0;

        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleZoneClick = (zone: ZoneData) => {
    setSelectedZone(zone);
    setIsDrawerOpen(true);
  };

  const handleOpenInEjudge = (zone: ZoneData) => {
    toast.success(`Открываем ${zone.name} в eJudge...`);
    // Simulate opening eJudge
    setTimeout(() => {
      window.open('https://ejudge.example.com', '_blank');
    }, 500);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedZone(null), 300);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <Header
        teamName={teamName}
        contestStatus="active"
        timeRemaining={timeRemaining}
        onLogout={onLogout}
      />

      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Map Canvas */}
        <MapCanvas
          zones={zones}
          onZoneClick={handleZoneClick}
          selectedZoneId={selectedZone?.id}
        />

        {/* Toolbox */}
        <Toolbox
          isMobile={isMobile}
          onRulesClick={() => setShowRules(true)}
          onContactClick={() => setShowContact(true)}
          onAnnouncementsClick={() => setShowAnnouncements(true)}
          onLeaderboardClick={() => setShowLeaderboard(true)}
          onHelpClick={() => setShowRules(true)}
        />

        {/* Right Drawer */}
        <RightDrawer
          zone={selectedZone}
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          onOpenInEjudge={handleOpenInEjudge}
          isMobile={isMobile}
        />
      </div>

      {/* Modals */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <ContactModal
        isOpen={showContact}
        onClose={() => setShowContact(false)}
      />
      <AnnouncementsModal
        isOpen={showAnnouncements}
        onClose={() => setShowAnnouncements(false)}
      />
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        currentTeamName={teamName}
      />
    </div>
  );
}
