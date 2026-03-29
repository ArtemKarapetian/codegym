import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Button } from '@/app/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
            <span className="text-2xl">!</span>
          </div>
          <h2 className="text-xl font-semibold">Что-то пошло не так</h2>
          <p className="text-sm text-gray-500 max-w-md">
            {this.state.error?.message || 'Произошла неожиданная ошибка'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Перезагрузить
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
