import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { LoginScreen } from '@/app/components/contest/LoginScreen';
import { MainArena } from '@/app/components/contest/MainArena';
import { Toaster } from '@/app/components/ui/sonner';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [teamName, setTeamName] = useState('');

  const handleLogin = (login: string, _password: string) => {
    setTeamName(login === 'demo' ? 'Team Alpha' : login);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setTeamName('');
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      {!isLoggedIn ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <MainArena teamName={teamName} onLogout={handleLogout} />
      )}
      <Toaster position="top-right" />
    </ThemeProvider>
  );
}
