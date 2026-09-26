import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
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
    console.error('Uncaught component error in ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 flex flex-col items-center justify-center text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          <h3 className="text-base font-bold">
            {this.props.fallbackTitle || 'A rendering error occurred in this view'}
          </h3>
          <p className="text-xs text-red-700 dark:text-red-300 font-mono max-w-lg">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
