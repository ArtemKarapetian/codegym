import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { AuthProvider, useAuth } from '@/lib/auth';
import { LoginScreen } from '@/app/components/contest/LoginScreen';
import { MainArena } from '@/app/components/contest/MainArena';
import { PublicLeaderboard } from '@/app/components/contest/PublicLeaderboard';
import { CityListPage } from '@/app/components/contest/CityListPage';
import { ErrorBoundary } from '@/app/components/contest/ErrorBoundary';
import { AdminLayout } from '@/app/components/admin/AdminLayout';
import { CitiesPage } from '@/app/components/admin/CitiesPage';
import { CityDetailPage } from '@/app/components/admin/CityDetailPage';
import { Toaster } from '@/app/components/ui/sonner';

function ProtectedRoute({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: 'admin' | 'team';
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--tinkoff-yellow)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/contest" replace />;
}

function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route
          path="/cities"
          element={
            <ProtectedRoute role="admin">
              <CityListPage />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/contest"
          element={
            <ProtectedRoute role="team">
              <ContestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<CitiesPage />} />
          <Route path="cities/:cityId" element={<CityDetailPage />} />
        </Route>
        <Route
          path="/public/leaderboard/:cityId"
          element={<PublicLeaderboard />}
        />
      </Routes>
    </AuthProvider>
  );
}

function LoginPage() {
  const { login, user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return <LoginScreen onLogin={login} />;
}

function ContestPage() {
  const { user, logout } = useAuth();
  if (!user || !user.cityId) return <Navigate to="/login" replace />;

  return (
    <MainArena
      teamName={user.teamName || user.login}
      cityId={user.cityId}
      onLogout={logout}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider attribute="class" defaultTheme="light">
          <AppRoutes />
          <Toaster position="top-right" />
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
