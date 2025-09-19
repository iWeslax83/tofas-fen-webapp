import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Wifi, Shield, Server, Bug, HelpCircle } from 'lucide-react';
import { AppError, ErrorType, ErrorSeverity, errorHandler } from '../utils/errorHandling';
import './EnhancedErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: AppError | null;
  errorInfo: ErrorInfo | null;
  isRetrying: boolean;
}

class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Convert regular error to AppError
    const appError = errorHandler.categorizeError(error, {
      component: 'ErrorBoundary'
    });
    
    return {
      hasError: true,
      error: appError,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('EnhancedErrorBoundary caught an error:', error, errorInfo);
    
    // Convert to AppError and handle
    const appError = errorHandler.categorizeError(error, {
      component: 'ErrorBoundary'
    });
    
    this.setState({
      error: appError,
      errorInfo
    });

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(appError, errorInfo);
    }

    // Handle error through error handler
    errorHandler.handleError(error, {
      component: 'ErrorBoundary',
      action: 'componentDidCatch'
    });
  }

  handleRetry = async () => {
    this.setState({ isRetrying: true });
    
    try {
      // Wait a bit before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false
      });
    } catch {
      this.setState({ isRetrying: false });
    }
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleRefresh = () => {
    window.location.reload();
  };

  getErrorIcon = (error: AppError) => {
    switch (error.type) {
      case ErrorType.NETWORK:
        return <Wifi size={48} className="error-icon-network" />;
      case ErrorType.AUTHENTICATION:
        return <Shield size={48} className="error-icon-auth" />;
      case ErrorType.SERVER:
        return <Server size={48} className="error-icon-server" />;
      case ErrorType.CLIENT:
        return <Bug size={48} className="error-icon-client" />;
      default:
        return <AlertTriangle size={48} className="error-icon-default" />;
    }
  };

  getErrorColor = (error: AppError) => {
    switch (error.severity) {
      case ErrorSeverity.LOW:
        return 'var(--error-low)';
      case ErrorSeverity.MEDIUM:
        return 'var(--error-medium)';
      case ErrorSeverity.HIGH:
        return 'var(--error-high)';
      case ErrorSeverity.CRITICAL:
        return 'var(--error-critical)';
      default:
        return 'var(--error-medium)';
    }
  };

  getRecoveryActions = (error: AppError) => {
    const actions = [];

    // Always show retry for non-critical errors
    if (error.severity !== ErrorSeverity.CRITICAL) {
      actions.push({
        label: 'Tekrar Dene',
        icon: <RefreshCw size={16} />,
        action: this.handleRetry,
        primary: true
      });
    }

    // Show refresh for client errors
    if (error.type === ErrorType.CLIENT) {
      actions.push({
        label: 'Sayfayı Yenile',
        icon: <RefreshCw size={16} />,
        action: this.handleRefresh,
        primary: false
      });
    }

    // Show home for authentication errors
    if (error.type === ErrorType.AUTHENTICATION) {
      actions.push({
        label: 'Ana Sayfaya Dön',
        icon: <Home size={16} />,
        action: this.handleGoHome,
        primary: false
      });
    }

    return actions;
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const error = this.state.error;
      const actions = this.getRecoveryActions(error);
      const recoverySuggestion = errorHandler.getRecoverySuggestion(error);

      return (
        <div className="enhanced-error-boundary" style={{ '--error-color': this.getErrorColor(error) } as React.CSSProperties}>
          <div className="error-container">
            <div className="error-header">
              {this.getErrorIcon(error)}
              <h1 className="error-title">Bir Hata Oluştu</h1>
              <p className="error-message">{error.message}</p>
            </div>

            <div className="error-details">
              <div className="error-info">
                <div className="error-type">
                  <span className="error-label">Hata Türü:</span>
                  <span className="error-value">{error.type}</span>
                </div>
                <div className="error-severity">
                  <span className="error-label">Önem:</span>
                  <span className="error-value">{error.severity}</span>
                </div>
                {recoverySuggestion && (
                  <div className="error-recovery">
                    <span className="error-label">Önerilen Çözüm:</span>
                    <span className="error-value">{recoverySuggestion}</span>
                  </div>
                )}
              </div>

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="error-stack">
                  <summary>Geliştirici Bilgileri</summary>
                  <div className="error-stack-content">
                    <pre>{error.toString()}</pre>
                    <pre>{this.state.errorInfo.componentStack}</pre>
                  </div>
                </details>
              )}
            </div>

            <div className="error-actions">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  disabled={this.state.isRetrying}
                  className={`error-action ${action.primary ? 'primary' : 'secondary'}`}
                >
                  {this.state.isRetrying ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    action.icon
                  )}
                  {this.state.isRetrying ? 'Yenileniyor...' : action.label}
                </button>
              ))}
            </div>

            <div className="error-help">
              <HelpCircle size={16} />
              <span>Yardıma mı ihtiyacınız var? <a href="/help">Yardım Merkezi</a>'ni ziyaret edin.</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;
