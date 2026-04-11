import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Trophy,
  Medal,
  Maximize,
  Minimize,
  Snowflake,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { TeamScore, City, TimerState } from '@shared/types';
import type { LeaderboardResponse } from '@shared/api';

export function PublicLeaderboard() {
  const { cityId } = useParams<{ cityId: string }>();
  const [city, setCity] = useState<City | null>(null);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [lastUpdate, setLastUpdate] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('--:--:--');
  const [timerStatus, setTimerStatus] = useState<string>('pending');
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const remainingRef = useRef(0);

  // City metadata (name, etc.)
  useEffect(() => {
    if (!cityId) return;
    fetch(`/api/cities/public/${cityId}`)
      .then((r) => r.json())
      .then((c: City) => setCity(c))
      .catch(console.error);
  }, [cityId]);

  // Leaderboard polling
  useEffect(() => {
    if (!cityId) return;

    const fetchLeaderboard = () => {
      fetch(`/api/public/cities/${cityId}/leaderboard`)
        .then((r) => r.json())
        .then((body: LeaderboardResponse) => {
          setData(body);
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

  // Timer polling + local tick
  useEffect(() => {
    if (!cityId) return;

    const formatTime = (s: number) => {
      const safe = Math.max(0, s);
      const h = Math.floor(safe / 3600);
      const m = Math.floor((safe % 3600) / 60);
      const sec = safe % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const fetchTimer = () => {
      fetch(`/api/public/cities/${cityId}/timer`)
        .then((r) => r.json())
        .then((t: TimerState) => {
          setTimerStatus(t.status);
          remainingRef.current = t.remainingSeconds;
          setTimeRemaining(formatTime(t.remainingSeconds));
        })
        .catch(console.error);
    };

    fetchTimer();
    const poll = setInterval(fetchTimer, 10000);
    const tick = setInterval(() => {
      if (timerStatus === 'running' && remainingRef.current > 0) {
        remainingRef.current--;
        setTimeRemaining(formatTime(remainingRef.current));
      }
    }, 1000);

    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [cityId, timerStatus]);

  // Fullscreen hooks
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

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

  const teams = data?.teams ?? [];
  const frozen = data?.frozen ?? false;
  const taskCount = data?.taskCount ?? 10;
  const exerciseNames = data?.exerciseNames ?? [];

  const taskLetters = Array.from({ length: taskCount }, (_, i) =>
    String.fromCharCode(65 + i),
  );

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
          style={{ maxWidth: '90rem' }}
        >
          <Link
            to="/"
            className="flex items-center gap-2 text-black/80 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <img src="/logo.png" alt="Код спорта" className="h-5" />
          </Link>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-xl md:text-2xl font-bold text-black">
            {city?.name ? `Лидерборд — ${city.name}` : 'Лидерборд'}
          </h1>
          <div className="flex items-center gap-3">
            {frozen && (
              <span className="flex items-center gap-1.5 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                <Snowflake className="w-3.5 h-3.5" />
                Заморожен
              </span>
            )}
            {timerStatus === 'running' && (
              <span className="font-mono font-bold text-black/80 text-lg">
                {timeRemaining}
              </span>
            )}
            {timerStatus === 'paused' && (
              <span className="font-mono font-bold text-black/60 text-lg">
                {timeRemaining} · пауза
              </span>
            )}
            {timerStatus === 'finished' && (
              <span className="font-semibold text-black/60 text-sm">
                Завершён
              </span>
            )}
            {timerStatus === 'pending' && (
              <span className="font-semibold text-black/60 text-sm">
                Ожидание
              </span>
            )}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-black/10 transition-colors"
              title={isFullscreen ? 'Выйти' : 'Полный экран'}
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
        className="flex-1 min-h-0 mx-auto px-4 py-4 w-full overflow-auto"
        style={{ maxWidth: '90rem' }}
      >
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{ backgroundColor: 'rgba(255,221,45,0.2)' }}
                className="border-b border-gray-200"
              >
                <th className="px-2 py-2 text-center w-10 font-semibold text-gray-600">
                  #
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600 min-w-[12rem]">
                  Команда
                </th>
                <th className="px-2 py-2 text-center w-14 font-semibold text-gray-900">
                  Σ
                </th>
                <th className="px-2 py-2 text-center w-16 font-semibold text-gray-600">
                  Штраф
                </th>
                {taskLetters.map((p) => (
                  <th
                    key={`task-${p}`}
                    className="px-1 py-2 text-center w-9 font-bold text-gray-700"
                  >
                    {p}
                  </th>
                ))}
                <th className="px-2 py-2 text-center w-20 font-semibold text-gray-600 border-l border-gray-200">
                  Упр.
                </th>
                {exerciseNames.map((name, i) => (
                  <th
                    key={`ex-${i}`}
                    className="px-1 py-2 text-center w-9 font-semibold text-purple-700"
                    title={name}
                  >
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {teams.map((team) => (
                  <TeamRow
                    key={team.login}
                    team={team}
                    taskLetters={taskLetters}
                    exerciseCount={exerciseNames.length}
                  />
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {teams.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <Trophy className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">Нет данных</p>
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
            <span className="font-mono text-gray-300">—</span> — нет
          </span>
          <span className="text-purple-600">
            упражнения — столбцы 1…9 (последнее опционально)
          </span>
        </div>
        <span>Обновлено: {lastUpdate || '...'}</span>
      </div>
    </div>
  );
}

function TeamRow({
  team,
  taskLetters,
  exerciseCount,
}: {
  team: TeamScore;
  taskLetters: string[];
  exerciseCount: number;
}) {
  const rowBg =
    team.rank <= 3
      ? 'rgba(255,221,45,0.15)'
      : team.rank % 2 === 0
        ? 'rgba(255,221,45,0.05)'
        : '#ffffff';

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{
        layout: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.3 },
      }}
      className="border-b border-gray-100"
      style={{ backgroundColor: rowBg }}
    >
      <td className="px-2 py-2 text-center">{rankBadge(team.rank)}</td>
      <td className="px-3 py-2">
        <span
          className={`font-semibold text-sm ${team.rank <= 3 ? 'text-black' : 'text-gray-800'}`}
        >
          {team.teamName}
        </span>
      </td>
      <td className="px-2 py-2 text-center">
        <span className="font-mono font-bold">{team.score}</span>
      </td>
      <td className="px-2 py-2 text-center">
        <span className="font-mono text-red-600 text-xs">{team.penalty}</span>
      </td>
      {taskLetters.map((letter) => {
        const p = team.problems?.[letter];
        return (
          <td key={`t-${letter}`} className="px-1 py-2 text-center">
            {p?.solved ? (
              <span className="font-mono font-bold text-green-700">+</span>
            ) : (
              <span className="text-gray-300">—</span>
            )}
          </td>
        );
      })}
      <td className="px-2 py-2 text-center border-l border-gray-200">
        <span className="font-mono font-semibold text-purple-700">
          {team.exercisesDone}
        </span>
      </td>
      {Array.from({ length: exerciseCount }).map((_, i) => (
        <td key={`e-${i}`} className="px-1 py-2 text-center">
          {team.exercises[i] ? (
            <span className="font-mono font-bold text-purple-700">✓</span>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>
      ))}
    </motion.tr>
  );
}

function rankBadge(rank: number) {
  if (rank === 1) return <Medal className="w-5 h-5 text-yellow-500 inline" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-400 inline" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600 inline" />;
  return <span className="font-mono font-bold text-gray-500">{rank}</span>;
}
