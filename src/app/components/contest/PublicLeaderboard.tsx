import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, Medal, Maximize, Minimize, ArrowLeft } from 'lucide-react';
import type { TeamScore, ProblemResult } from '@shared/types';

const PROBLEMS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

export function PublicLeaderboard() {
  const { cityId } = useParams<{ cityId: string }>();
  const [leaderboard, setLeaderboard] = useState<TeamScore[]>([]);
  const [lastUpdate, setLastUpdate] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorHidden, setCursorHidden] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorTimer = useRef<ReturnType<typeof setTimeout>>();

  // Fetch leaderboard
  useEffect(() => {
    if (!cityId) return;

    const fetchLeaderboard = () => {
      fetch(`/api/public/cities/${cityId}/leaderboard`)
        .then((r) => r.json())
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

  const renderProblemCell = (problem: ProblemResult | undefined) => {
    if (!problem) {
      return <td className="px-2 py-3 text-center text-gray-300">—</td>;
    }

    if (problem.solved) {
      return (
        <td className="px-2 py-3 text-center">
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
      <td className="px-2 py-3 text-center">
        <span className="font-mono text-red-400">-{problem.attempts}</span>
      </td>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`min-h-screen bg-white flex flex-col ${cursorHidden ? 'cursor-none' : ''}`}
    >
      {/* Header */}
      <div className="bg-[var(--tinkoff-yellow)] px-8 py-5 shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link
              to="/cities"
              className="p-2 rounded-lg bg-black/10 hover:bg-black/20 transition-colors"
              title="Назад к городам"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <img src="/logo.png" alt="Код спорта" className="h-5" />
            <div>
              <p className="text-sm text-black/60">Лидерборд</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Trophy className="w-10 h-10 text-black/30" />
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-black/10 hover:bg-black/20 transition-colors"
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
      <div className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-center w-14 font-semibold text-gray-600">
                  #
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Команда
                </th>
                <th className="px-3 py-3 text-center w-16 font-semibold text-gray-600">
                  Σ
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
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((team) => (
                <tr
                  key={team.rank}
                  className={`border-b border-gray-100 transition-colors ${
                    team.rank <= 3
                      ? 'bg-[var(--tinkoff-yellow)]/10'
                      : team.rank % 2 === 0
                        ? 'bg-gray-50/50'
                        : 'bg-white'
                  }`}
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
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {leaderboard.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Trophy className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">Загрузка...</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 bg-gray-50 border-t border-gray-200 px-8 py-2 flex items-center justify-between text-xs text-gray-400">
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
        <span>Обновлено: {lastUpdate || '...'}</span>
      </div>
    </div>
  );
}
