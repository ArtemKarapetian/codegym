import React, { useState } from 'react';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';

interface LoginScreenProps {
  onLogin: (teamLogin: string, password: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [teamLogin, setTeamLogin] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate login
    setTimeout(() => {
      if (teamLogin === 'demo' && password === 'demo') {
        onLogin(teamLogin, password);
      } else {
        setError('Неверный логин или пароль');
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[var(--tinkoff-gray)] to-[var(--tinkoff-yellow)]/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[var(--tinkoff-yellow)] rounded-3xl mb-4 shadow-lg animate-in zoom-in duration-700">
            <span className="text-3xl font-bold">CG</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
            Code Gym × T-Bank
          </h1>
          <p className="text-gray-600 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200">
            Офлайн-контест
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-[var(--tinkoff-border)] p-8 animate-in fade-in slide-in-from-bottom-3 duration-700 delay-300">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Вход для команды
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="teamLogin">Логин команды</Label>
              <Input
                id="teamLogin"
                type="text"
                placeholder="team_name"
                value={teamLogin}
                onChange={(e) => setTeamLogin(e.target.value)}
                required
                disabled={isLoading}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-12"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 animate-in fade-in slide-in-from-top-1 duration-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-[var(--tinkoff-yellow)] hover:bg-[var(--tinkoff-yellow)]/90 text-black font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Вход...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Войти
                </>
              )}
            </Button>

            <p className="text-sm text-gray-500 text-center mt-4">
              Доступ выдан при регистрации
            </p>
          </form>
        </div>

        {/* Help Link */}
        <div className="text-center mt-6 animate-in fade-in duration-700 delay-500">
          <p className="text-sm text-gray-600">
            Нужна помощь?{' '}
            <a
              href="https://t.me/codegym24"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              Написать организаторам в Telegram
            </a>
          </p>
          <p className="text-xs text-gray-500 mt-1">@codegym24</p>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-8 p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-[var(--tinkoff-border)] animate-in fade-in duration-700 delay-700">
          <p className="text-xs text-gray-500 text-center">
            <strong>Demo:</strong> логин:{' '}
            <code className="bg-gray-100 px-1 rounded">demo</code> / пароль:{' '}
            <code className="bg-gray-100 px-1 rounded">demo</code>
          </p>
        </div>
      </div>
    </div>
  );
}
