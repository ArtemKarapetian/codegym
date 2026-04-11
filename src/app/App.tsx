import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { AuthProvider, useAuth } from '@/lib/auth';
import { LoginScreen } from '@/app/components/contest/LoginScreen';
import { PublicLeaderboard } from '@/app/components/contest/PublicLeaderboard';
import { PublicHome } from '@/app/components/contest/PublicHome';
import { ErrorBoundary } from '@/app/components/contest/ErrorBoundary';
import { AdminLayout } from '@/app/components/admin/AdminLayout';
import { CitiesPage } from '@/app/components/admin/CitiesPage';
import { CityDetailPage } from '@/app/components/admin/CityDetailPage';
import { Toaster } from '@/app/components/ui/sonner';

function AdminProtected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--tinkoff-yellow)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<PublicHome />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={
            <AdminProtected>
              <AdminLayout />
            </AdminProtected>
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
  if (user) return <Navigate to="/admin" replace />;
  return <LoginScreen onLogin={login} />;
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
