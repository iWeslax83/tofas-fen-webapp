import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { ultraSafeErrorLog } from '../utils/safeLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  resetKey?: string; // changes to this value auto-reset the error state
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  componentDidUpdate(prevProps: Props) {
    // Auto-reset when resetKey changes (e.g. route change)
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    ultraSafeErrorLog('ErrorBoundary caught an error:', error?.message || 'Unknown error');
    ultraSafeErrorLog('Component stack:', errorInfo?.componentStack || 'No stack trace');
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Error logged to monitoring service
      ultraSafeErrorLog('Error logged:', error?.message || 'Unknown error');
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-icon">
              <AlertTriangle size={64} className="text-red-500" />
            </div>
            <h1 className="error-title">Bir Hata Oluştu</h1>
            <p className="error-message">
              Beklenmeyen bir hata oluştu. Lütfen sayfayı yenilemeyi deneyin.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Hata Detayları</summary>
                <pre className="error-stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="error-actions">
              <button
                onClick={this.handleRetry}
                className="btn btn-primary"
              >
                <RefreshCw size={16} />
                Tekrar Dene
              </button>
              <button
                onClick={this.handleGoHome}
                className="btn btn-secondary"
              >
                <Home size={16} />
                Ana Sayfaya Dön
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
