import React, { useState } from 'react';
import { Bug, Wifi, Shield, Server, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { useErrorHandler, ErrorType, ErrorSeverity, AppError } from '../../utils/errorHandling';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import './ErrorHandlingDemoPage.css';
import { safeConsoleLog } from '../../utils/safeLogger';

const ErrorHandlingDemoPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('network');
  const [isLoading, setIsLoading] = useState(false);
  const { handleError, retryOperation } = useErrorHandler();

  const sections = [
    { id: 'network', name: 'Ağ Hataları', icon: '🌐', color: '#3b82f6' },
    { id: 'auth', name: 'Kimlik Doğrulama', icon: '🔐', color: '#f59e0b' },
    { id: 'server', name: 'Sunucu Hataları', icon: '🖥️', color: '#ef4444' },
    { id: 'client', name: 'İstemci Hataları', icon: '💻', color: '#8b5cf6' },
    { id: 'validation', name: 'Doğrulama Hataları', icon: '⚠️', color: '#f59e0b' },
    { id: 'retry', name: 'Retry Mekanizması', icon: '🔄', color: '#10b981' },
    { id: 'custom', name: 'Özel Hatalar', icon: '🎯', color: '#ec4899' },
  ];

  const simulateNetworkError = () => {
    const error = new Error('Network Error');
    (error as any).code = 'NETWORK_ERROR';
    handleError(error, { component: 'ErrorDemo', action: 'networkTest' });
  };

  const simulateAuthError = () => {
    const error = new Error('Unauthorized');
    (error as any).response = { status: 401, data: { message: 'Oturum süreniz dolmuş' } };
    handleError(error, { component: 'ErrorDemo', action: 'authTest' });
  };

  const simulateServerError = () => {
    const error = new Error('Internal Server Error');
    (error as any).response = { status: 500, data: { message: 'Sunucu hatası oluştu' } };
    handleError(error, { component: 'ErrorDemo', action: 'serverTest' });
  };

  const simulateClientError = () => {
    const error = new TypeError('Cannot read property of undefined');
    handleError(error, { component: 'ErrorDemo', action: 'clientTest' });
  };

  const simulateValidationError = () => {
    const error = new Error('Validation failed');
    error.name = 'ValidationError';
    handleError(error, { component: 'ErrorDemo', action: 'validationTest' });
  };

  const simulateRetryOperation = async () => {
    setIsLoading(true);
    try {
      await retryOperation(
        async () => {
          // Simulate a failing operation
          const random = Math.random();
          if (random > 0.3) {
            throw new Error('Temporary server error');
          }
          return 'Success!';
        },
        { component: 'ErrorDemo', action: 'retryTest' },
        3,
      );
    } catch {
      safeConsoleLog('Retry operation failed after all attempts');
    } finally {
      setIsLoading(false);
    }
  };

  const simulateCustomError = () => {
    const customError = new AppError(
      'Bu özel bir hata mesajıdır',
      ErrorType.UNKNOWN,
      ErrorSeverity.MEDIUM,
      { component: 'ErrorDemo', action: 'customTest' },
    );
    handleError(customError, { component: 'ErrorDemo', action: 'customTest' });
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'network':
        return (
          <div className="demo-section">
            <h3>Ağ Hataları</h3>
            <p>
              İnternet bağlantısı sorunlarını simüle eder. Bu hatalar genellikle otomatik olarak
              tekrar denenir.
            </p>
            <div className="demo-controls">
              <button onClick={simulateNetworkError} className="demo-button">
                <Wifi className="icon-small" />
                Ağ Hatası Simüle Et
              </button>
            </div>
          </div>
        );

      case 'auth':
        return (
          <div className="demo-section">
            <h3>Kimlik Doğrulama Hataları</h3>
            <p>
              Oturum süresi dolması veya yetki sorunlarını simüle eder. Bu hatalar retry edilmez.
            </p>
            <div className="demo-controls">
              <button onClick={simulateAuthError} className="demo-button">
                <Shield className="icon-small" />
                Kimlik Doğrulama Hatası Simüle Et
              </button>
            </div>
          </div>
        );

      case 'server':
        return (
          <div className="demo-section">
            <h3>Sunucu Hataları</h3>
            <p>
              Sunucu tarafında oluşan hataları simüle eder. Bu hatalar sınırlı sayıda tekrar
              denenir.
            </p>
            <div className="demo-controls">
              <button onClick={simulateServerError} className="demo-button">
                <Server className="icon-small" />
                Sunucu Hatası Simüle Et
              </button>
            </div>
          </div>
        );

      case 'client':
        return (
          <div className="demo-section">
            <h3>İstemci Hataları</h3>
            <p>Tarayıcı tarafında oluşan JavaScript hatalarını simüle eder.</p>
            <div className="demo-controls">
              <button onClick={simulateClientError} className="demo-button">
                <Bug className="icon-small" />
                İstemci Hatası Simüle Et
              </button>
            </div>
          </div>
        );

      case 'validation':
        return (
          <div className="demo-section">
            <h3>Doğrulama Hataları</h3>
            <p>Form doğrulama veya veri doğrulama hatalarını simüle eder.</p>
            <div className="demo-controls">
              <button onClick={simulateValidationError} className="demo-button">
                <AlertTriangle className="icon-small" />
                Doğrulama Hatası Simüle Et
              </button>
            </div>
          </div>
        );

      case 'retry':
        return (
          <div className="demo-section">
            <h3>Retry Mekanizması</h3>
            <p>Başarısız işlemleri otomatik olarak tekrar deneme mekanizmasını test eder.</p>
            <div className="demo-controls">
              <button onClick={simulateRetryOperation} className="demo-button" disabled={isLoading}>
                {isLoading ? (
                  <RefreshCw className="icon-small animate-spin" />
                ) : (
                  <Zap className="icon-small" />
                )}
                {isLoading ? 'Retry Test Ediliyor...' : 'Retry Mekanizmasını Test Et'}
              </button>
            </div>
          </div>
        );

      case 'custom':
        return (
          <div className="demo-section">
            <h3>Özel Hatalar</h3>
            <p>Geliştirici tarafından tanımlanan özel hata türlerini test eder.</p>
            <div className="demo-controls">
              <button onClick={simulateCustomError} className="demo-button">
                <Bug className="icon-small" />
                Özel Hata Simüle Et
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const breadcrumb = [{ label: 'Ana Sayfa', path: '/admin' }, { label: 'Error Handling Demo' }];

  return (
    <ModernDashboardLayout pageTitle="Error Handling Demo" breadcrumb={breadcrumb}>
      <div className="error-handling-demo-page">
        {/* Navigation */}
        <nav className="demo-nav">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`demo-nav-button ${activeSection === section.id ? 'active' : ''}`}
              style={{ '--section-color': section.color } as React.CSSProperties}
            >
              <span className="demo-nav-icon">{section.icon}</span>
              <span>{section.name}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="demo-content-wrapper">{renderSection()}</div>

        {/* Error Statistics */}
        <div className="error-stats">
          <h3>Hata İstatistikleri</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-value">0</div>
                <div className="stat-label">Toplam Hata</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔄</div>
              <div className="stat-content">
                <div className="stat-value">0</div>
                <div className="stat-label">Retry Edilen</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">0</div>
                <div className="stat-label">Çözülen</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏱️</div>
              <div className="stat-content">
                <div className="stat-value">0ms</div>
                <div className="stat-label">Ortalama Çözüm Süresi</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModernDashboardLayout>
  );
};

export default ErrorHandlingDemoPage;
