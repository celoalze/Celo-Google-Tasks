import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro não tratado:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div role="alert" aria-live="assertive" className="flex flex-col items-center justify-center h-full w-full p-6 text-center select-none bg-m3-surface text-m3-on-surface">
          <div className="w-16 h-16 rounded-full bg-m3-error/15 text-m3-error flex items-center justify-center mb-4">
            <span className="material-symbols-rounded text-[2rem]">warning</span>
          </div>
          <h2 className="text-base font-semibold text-m3-on-surface mb-2">
            Algo inesperado aconteceu
          </h2>
          <p className="text-xs text-m3-on-surface-variant max-w-sm mb-5 leading-relaxed">
            {this.state.error?.message || 'Ocorreu um erro ao carregar esta tela.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded-full text-xs font-medium text-m3-primary hover:bg-m3-primary/10 active:bg-m3-primary/15 focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:outline-none transition-colors"
            >
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 rounded-full bg-m3-primary text-m3-on-primary text-xs font-medium hover:bg-m3-primary/90 active:bg-m3-primary/80 focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:outline-none transition-colors shadow-m3-1"
            >
              Recarregar aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
