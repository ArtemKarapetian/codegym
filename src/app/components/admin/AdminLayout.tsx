import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, LogOut } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useAuth } from '@/lib/auth';

export function AdminLayout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--tinkoff-gray)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--tinkoff-border)] sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Код спорта" className="h-3.5" />
              <span className="font-semibold">Admin</span>
            </div>
            <nav className="flex items-center gap-1 ml-6">
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-[var(--tinkoff-yellow)]/20 font-medium' : 'hover:bg-gray-100'}`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                Города
              </NavLink>
              <NavLink
                to="/admin/exercises"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-[var(--tinkoff-yellow)]/20 font-medium' : 'hover:bg-gray-100'}`
                }
              >
                <Dumbbell className="w-4 h-4" />
                Упражнения
              </NavLink>
            </nav>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Выход
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
