import { Outlet } from 'react-router-dom';
import { LogOut, GraduationCap } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useAuth } from '@/lib/auth';

export function TrainerLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--tinkoff-gray)]">
      <header className="bg-white border-b border-[var(--tinkoff-border)] sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Код спорта" className="h-3.5" />
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--tinkoff-yellow)]/20 text-xs font-semibold">
              <GraduationCap className="w-3.5 h-3.5" />
              Тренер
            </div>
            {user?.teamName && (
              <span className="text-sm text-gray-500">{user.teamName}</span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Выход
          </Button>
        </div>
      </header>

      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
