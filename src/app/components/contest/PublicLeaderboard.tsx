import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy, Medal, Maximize, Minimize } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { TeamScore, ProblemResult, City } from '@shared/types';

const PROBLEMS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

export function PublicLeaderboard() {
  const { cityId } = useParams<{ cityId: string }>();
  const [leaderboard, setLeaderboard] = useState<TeamScore[]>([]);
  const [lastUpdate, setLastUpdate] = useState('');
  const [frozen, setFrozen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [timerStatus, setTimerStatus] = useState<string>('pending');
  const [isMinsk, setIsMinsk] = useState(false);
  const [funPointsMap, setFunPointsMap] = useState<Record<string, number>>({});
  const [sortByFun, setSortByFun] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorTimer = useRef<ReturnType<typeof setTimeout>>();
  const remainingRef = useRef(0);

  // Fetch leaderboard
  useEffect(() => {
    if (!cityId) return;

    const fetchLeaderboard = () => {
      fetch(`/api/public/cities/${cityId}/leaderboard`)
        .then((r) => {
          const isFrozen = r.headers.get('X-Leaderboard-Frozen') === '1';
          setFrozen(isFrozen);
          return r.json();
        })
        .then((data) => {
          setLeaderboard(data);
          setLastUpdate(
            new Date().toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
          );
        })
        .catch(console.error);
    };

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(interval);
  }, [cityId]);

  // Poll timer
  useEffect(() => {
    if (!cityId) return;

    const formatTime = (s: number) => {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const fetchTimer = () => {
      fetch(`/api/public/cities/${cityId}/timer`)
        .then((r) => r.json())
        .then((data: { status: string; remainingSeconds: number }) => {
          setTimerStatus(data.status);
          remainingRef.current = data.remainingSeconds;
          setTimeRemaining(formatTime(data.remainingSeconds));
        })
        .catch(console.error);
    };

    fetchTimer();
    const poll = setInterval(fetchTimer, 10000);

    // Local tick every second
    const tick = setInterval(() => {
      if (remainingRef.current > 0) {
        remainingRef.current--;
        setTimeRemaining(formatTime(remainingRef.current));
      }
    }, 1000);

    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [cityId]);

  // Detect Minsk and fetch fun points
  useEffect(() => {
    if (!cityId) return;

    fetch(`/api/cities/public`)
      .then((r) => r.json())
      .then((cities: City[]) => {
        const city = cities.find((c) => c.id === cityId);
        if (city?.name?.toLowerCase().includes('минск')) {
          setIsMinsk(true);
        }
      })
      .catch(console.error);

    const fetchFun = () => {
      fetch(`/api/public/cities/${cityId}/fun-points`)
        .then((r) => r.json())
        .then((data: Record<string, number>) => setFunPointsMap(data))
        .catch(console.error);
    };
    fetchFun();
    const funInterval = setInterval(fetchFun, 30000);
    return () => clearInterval(funInterval);
  }, [cityId]);

  // Track fullscreen state
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Auto-hide cursor after 3s of inactivity
  const resetCursorTimer = useCallback(() => {
    setCursorHidden(false);
    clearTimeout(cursorTimer.current);
    cursorTimer.current = setTimeout(() => setCursorHidden(true), 3000);
  }, []);

  useEffect(() => {
    cursorTimer.current = setTimeout(() => setCursorHidden(true), 3000);
    window.addEventListener('mousemove', resetCursorTimer);
    return () => {
      window.removeEventListener('mousemove', resetCursorTimer);
      clearTimeout(cursorTimer.current);
    };
  }, [resetCursorTimer]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  const sortedLeaderboard = useMemo(() => {
    if (!sortByFun) return leaderboard;
    const copy = [...leaderboard];
    copy.sort(
      (a, b) =>
        (funPointsMap[b.teamName] ?? 0) - (funPointsMap[a.teamName] ?? 0),
    );
    return copy.map((t, i) => ({ ...t, rank: i + 1 }));
  }, [leaderboard, sortByFun, funPointsMap]);

  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1:
        return <Medal className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <span className="font-mono font-bold text-gray-500">{rank}</span>
        );
    }
  };

  const renderProblemCell = (
    problem: ProblemResult | undefined,
    key: string,
  ) => {
    if (!problem) {
      return (
        <td key={key} className="px-2 py-3 text-center text-gray-300">
          —
        </td>
      );
    }

    if (problem.solved) {
      return (
        <td key={key} className="px-2 py-3 text-center">
          <div className="inline-flex flex-col items-center">
            <span className="font-mono font-bold text-green-700">
              +{problem.attempts === 1 ? '' : problem.attempts - 1}
            </span>
            {problem.penalty > 0 && (
              <span className="text-[10px] text-gray-400 font-mono">
                {problem.penalty}
              </span>
            )}
          </div>
        </td>
      );
    }

    return (
      <td key={key} className="px-2 py-3 text-center">
        <span className="font-mono text-red-400">-{problem.attempts}</span>
      </td>
    );
  };

  const getRowBg = (rank: number) => {
    if (rank <= 3) return 'rgba(255,221,45,0.15)';
    if (rank % 2 === 0) return 'rgba(255,221,45,0.05)';
    return '#ffffff';
  };

  return (
    <div
      ref={containerRef}
      style={{ backgroundColor: '#fffdf5' }}
      className={`h-screen flex flex-col overflow-hidden ${cursorHidden ? 'cursor-none' : ''}`}
    >
      {/* Header */}
      <div
        style={{ backgroundColor: '#FFDD2D' }}
        className="px-8 py-3 flex items-center shrink-0"
      >
        <div
          className="relative flex items-center justify-between w-full mx-auto"
          style={{ maxWidth: '80rem' }}
        >
          <img src="/logo.png" alt="Код спорта" className="h-5" />
          <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold text-black">
            Лидерборд
          </h1>
          <div className="flex items-center gap-3">
            {timerStatus === 'running' && timeRemaining && (
              <span className="font-mono font-bold text-black/80 text-lg">
                {timeRemaining}
              </span>
            )}
            {timerStatus === 'finished' && (
              <span className="font-semibold text-black/60 text-sm">
                Завершён
              </span>
            )}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-black/10 transition-colors"
              title={isFullscreen ? 'Выйти из полноэкранного' : 'Полный экран'}
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        className="flex-1 min-h-0 mx-auto px-4 py-4 w-full"
        style={{ maxWidth: '80rem' }}
      >
        <div className="rounded-xl border border-gray-200 overflow-hidden h-full">
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{ backgroundColor: 'rgba(255,221,45,0.2)' }}
                className="border-b border-gray-200"
              >
                <th className="px-4 py-3 text-center w-14 font-semibold text-gray-600">
                  #
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Команда
                </th>
                <th
                  className={`px-3 py-3 text-center w-16 font-semibold cursor-pointer select-none ${
                    !sortByFun
                      ? 'text-gray-900'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  onClick={() => setSortByFun(false)}
                  title="Сортировка по решённым задачам"
                >
                  Σ {!sortByFun && isMinsk ? '▼' : ''}
                </th>
                <th className="px-3 py-3 text-center w-16 font-semibold text-gray-600">
                  Штраф
                </th>
                {PROBLEMS.map((p) => (
                  <th
                    key={p}
                    className="px-2 py-3 text-center w-14 font-bold text-gray-700"
                  >
                    {p}
                  </th>
                ))}
                {isMinsk && (
                  <th
                    className="px-2 py-3 text-center w-16 font-bold text-purple-700 cursor-pointer hover:text-purple-900 select-none"
                    onClick={() => setSortByFun((v) => !v)}
                    title="Нажми для сортировки по Fun"
                  >
                    Fun {sortByFun ? '▼' : ''}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {sortedLeaderboard.map((team) => (
                  <motion.tr
                    key={team.teamName}
                    layout
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{
                      layout: { type: 'spring', stiffness: 300, damping: 30 },
                      opacity: { duration: 0.3 },
                    }}
                    className="border-b border-gray-100"
                    style={{
                      backgroundColor: getRowBg(team.rank),
                    }}
                  >
                    <td className="px-4 py-3 text-center">
                      {getRankDisplay(team.rank)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold ${team.rank <= 3 ? 'text-black' : 'text-gray-800'}`}
                      >
                        {team.teamName}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-mono font-bold text-lg">
                        {team.solved}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-mono text-red-600">
                        {team.penalty}
                      </span>
                    </td>
                    {PROBLEMS.map((p) =>
                      renderProblemCell(
                        team.problems?.[p] as ProblemResult | undefined,
                        p,
                      ),
                    )}
                    {isMinsk && (
                      <td className="px-2 py-3 text-center">
                        <span className="font-mono font-bold text-purple-700">
                          {(funPointsMap[team.teamName] ?? 0) % 1 === 0
                            ? (funPointsMap[team.teamName] ?? 0)
                            : (funPointsMap[team.teamName] ?? 0).toFixed(1)}
                        </span>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {sortedLeaderboard.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <Trophy className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">Загрузка...</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="shrink-0 border-t border-gray-200 px-8 py-2 flex items-center justify-between text-xs text-gray-400"
        style={{ backgroundColor: '#f9fafb' }}
      >
        <div className="flex items-center gap-4">
          <span>
            <span className="font-mono font-bold text-green-700">+</span> —
            решено
          </span>
          <span>
            <span className="font-mono font-bold text-green-700">+2</span> —
            решено с 2 неуд. попытками
          </span>
          <span>
            <span className="font-mono text-red-400">-1</span> — не решено, 1
            попытка
          </span>
        </div>
        <div className="flex items-center gap-3">
          {frozen && (
            <span className="text-blue-600 font-semibold">
              Таблица заморожена
            </span>
          )}
          <span>Обновлено: {lastUpdate || '...'}</span>
        </div>
      </div>
    </div>
  );
}
