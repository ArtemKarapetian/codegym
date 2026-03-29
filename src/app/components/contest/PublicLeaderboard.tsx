import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy, Medal } from 'lucide-react';
import type { TeamScore } from '@shared/types';

export function PublicLeaderboard() {
  const { cityId } = useParams<{ cityId: string }>();
  const [leaderboard, setLeaderboard] = useState<TeamScore[]>([]);
  useEffect(() => {
    if (!cityId) return;

    const fetchLeaderboard = () => {
      fetch(`/api/public/cities/${cityId}/leaderboard`)
        .then((r) => r.json())
        .then(setLeaderboard)
        .catch(console.error);
    };

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(interval);
  }, [cityId]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Medal className="w-8 h-8 text-yellow-500" />;
      case 2:
        return <Medal className="w-8 h-8 text-gray-400" />;
      case 3:
        return <Medal className="w-8 h-8 text-amber-700" />;
      default:
        return (
          <span className="text-2xl font-bold text-gray-400">#{rank}</span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[var(--tinkoff-yellow)] rounded-xl flex items-center justify-center">
            <span className="text-black font-bold text-xl">CG</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold">Code Gym × T-Bank</h1>
            <p className="text-gray-400">Лидерборд</p>
          </div>
        </div>
        <Trophy className="w-12 h-12 text-[var(--tinkoff-yellow)]" />
      </div>

      {/* Leaderboard */}
      <div className="space-y-3">
        {leaderboard.map((team) => (
          <div
            key={team.rank}
            className={`flex items-center gap-6 p-5 rounded-2xl transition-all ${
              team.rank <= 3
                ? 'bg-gradient-to-r from-[var(--tinkoff-yellow)]/20 to-transparent border border-[var(--tinkoff-yellow)]/30'
                : 'bg-white/5 border border-white/10'
            }`}
          >
            <div className="w-16 flex justify-center">
              {getRankIcon(team.rank)}
            </div>
            <div className="flex-1">
              <p className="text-xl font-semibold">{team.teamName}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[var(--tinkoff-yellow)]">
                {team.score}
              </p>
              <p className="text-xs text-gray-400">баллов</p>
            </div>
            <div className="text-right w-20">
              <p className="text-lg font-mono text-red-400">+{team.penalty}</p>
              <p className="text-xs text-gray-400">штраф</p>
            </div>
            <div className="text-right w-20">
              <p className="text-lg font-mono">{team.solved}</p>
              <p className="text-xs text-gray-400">решено</p>
            </div>
          </div>
        ))}
      </div>

      {leaderboard.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <Trophy className="w-20 h-20 mb-4 opacity-20" />
          <p className="text-xl">Загрузка...</p>
        </div>
      )}

      {/* Auto-refresh indicator */}
      <div className="fixed bottom-4 right-4 text-xs text-gray-600">
        Обновляется каждые 10 секунд
      </div>
    </div>
  );
}
