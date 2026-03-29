import { AlertTriangle, WifiOff, Clock } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface ErrorStateProps {
  type: 'unavailable' | 'completed' | 'maintenance';
  onRetry?: () => void;
}

export function ErrorState({ type, onRetry }: ErrorStateProps) {
  const getContent = () => {
    switch (type) {
      case 'unavailable':
        return {
          icon: <WifiOff className="w-24 h-24 text-gray-300" />,
          title: 'Ссылка недоступна',
          message: 'Проверьте подключение к интернету или попробуйте позже',
        };
      case 'completed':
        return {
          icon: <Clock className="w-24 h-24 text-gray-300" />,
          title: 'Контест завершён',
          message: 'Этот контест уже закончился. Спасибо за участие!',
        };
      case 'maintenance':
        return {
          icon: <AlertTriangle className="w-24 h-24 text-yellow-400" />,
          title: 'Технические работы',
          message: 'Платформа временно недоступна. Мы скоро вернёмся!',
        };
    }
  };

  const content = getContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[var(--tinkoff-gray)] to-[var(--tinkoff-yellow)]/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">{content.icon}</div>
        <h1 className="text-3xl font-bold mb-3">{content.title}</h1>
        <p className="text-gray-600 mb-8">{content.message}</p>
        {onRetry && (
          <Button
            onClick={onRetry}
            className="bg-[var(--tinkoff-yellow)] hover:bg-[var(--tinkoff-yellow)]/90 text-black"
          >
            Попробовать снова
          </Button>
        )}
        <div className="mt-8">
          <p className="text-sm text-gray-500">
            Нужна помощь?{' '}
            <a
              href="https://t.me/codegym24"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Написать в Telegram
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
