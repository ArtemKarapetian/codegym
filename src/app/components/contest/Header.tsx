import { LogOut } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface HeaderProps {
  teamName?: string;
  contestStatus: 'active' | 'pending' | 'completed';
  timeRemaining?: string;
  onLogout?: () => void;
}

export function Header({
  teamName,
  contestStatus,
  timeRemaining,
  onLogout,
}: HeaderProps) {
  const getStatusBadge = () => {
    switch (contestStatus) {
      case 'active':
        return (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--status-active)] animate-pulse"></div>
            <span className="text-xs sm:text-sm">Контест идёт</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--status-pending)]"></div>
            <span className="text-xs sm:text-sm">Ожидание</span>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--status-completed)]"></div>
            <span className="text-xs sm:text-sm">Завершён</span>
          </div>
        );
    }
  };

  return (
    <header className="border-b border-[var(--tinkoff-border)] bg-white">
      <div className="flex items-center justify-between px-4 lg:px-8 h-16 lg:h-20">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[var(--tinkoff-yellow)] rounded-lg flex items-center justify-center shadow-lg">
              <span className="font-bold text-sm sm:text-lg">CG</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-semibold text-base lg:text-lg">
                Code Gym × T-Bank
              </h1>
            </div>
          </div>
        </div>

        {/* Center: Status */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          {getStatusBadge()}
          {timeRemaining && (
            <>
              <div className="hidden sm:block w-px h-6 bg-[var(--tinkoff-border)]"></div>
              <div className="font-mono text-xs sm:text-sm lg:text-base tabular-nums">
                {timeRemaining}
              </div>
            </>
          )}
        </div>

        {/* Right: Team & Logout */}
        <div className="flex items-center gap-2 lg:gap-4">
          {teamName && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--tinkoff-gray)] rounded-full flex items-center justify-center">
                <span className="text-xs font-medium">
                  {teamName.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="text-sm hidden lg:block">{teamName}</span>
            </div>
          )}
          {onLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Выход</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
