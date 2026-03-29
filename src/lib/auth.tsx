import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken, clearToken, getToken } from './api';
import type { User } from '@shared/types';
import type { LoginResponse, MeResponse } from '@shared/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => !!getToken());
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) return;

    api
      .get<MeResponse>('/api/auth/me')
      .then((res) => setUser(res.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, [loading]);

  const login = useCallback(
    async (loginStr: string, password: string) => {
      const res = await api.post<LoginResponse>('/api/auth/login', {
        login: loginStr,
        password,
      });
      setToken(res.token);
      setUser(res.user);

      if (res.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/contest');
      }
    },
    [navigate],
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
