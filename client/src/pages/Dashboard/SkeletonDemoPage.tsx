import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  SkeletonCard,
  SkeletonClubCard,
  SkeletonTable,
  SkeletonForm,
  SkeletonList,
  SkeletonDashboard,
  SkeletonProfile,
  SkeletonNotification,
  SkeletonCalendar,
  SkeletonChart,
  LoadingState
} from '../../components/SkeletonComponents';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import './SkeletonDemoPage.css';

const SkeletonDemoPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('cards');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  const handleError = () => {
    setError('Bu bir demo hata mesajıdır.');
  };

  const sections = [
    { id: 'cards', name: 'Kartlar', icon: '🃏' },
    { id: 'tables', name: 'Tablolar', icon: '📊' },
    { id: 'forms', name: 'Formlar', icon: '📝' },
    { id: 'lists', name: 'Listeler', icon: '📋' },
    { id: 'dashboard', name: 'Dashboard', icon: '🏠' },
    { id: 'profile', name: 'Profil', icon: '👤' },
    { id: 'notifications', name: 'Bildirimler', icon: '🔔' },
    { id: 'calendar', name: 'Takvim', icon: '📅' },
    { id: 'charts', name: 'Grafikler', icon: '📈' },
    { id: 'loading', name: 'Loading States', icon: '⏳' }
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'cards':
        return (
          <div className="demo-section">
            <h3>Kart Skeleton Bileşenleri</h3>
            <div className="demo-grid">
              <SkeletonCard />
              <SkeletonClubCard />
              <SkeletonCard />
              <SkeletonClubCard />
            </div>
          </div>
        );

      case 'tables':
        return (
          <div className="demo-section">
            <h3>Tablo Skeleton Bileşenleri</h3>
            <SkeletonTable rows={6} columns={4} />
          </div>
        );

      case 'forms':
        return (
          <div className="demo-section">
            <h3>Form Skeleton Bileşenleri</h3>
            <SkeletonForm fields={5} />
          </div>
        );

      case 'lists':
        return (
          <div className="demo-section">
            <h3>Liste Skeleton Bileşenleri</h3>
            <SkeletonList items={4} />
          </div>
        );

      case 'dashboard':
        return (
          <div className="demo-section">
            <h3>Dashboard Skeleton Bileşeni</h3>
            <SkeletonDashboard />
          </div>
        );

      case 'profile':
        return (
          <div className="demo-section">
            <h3>Profil Skeleton Bileşeni</h3>
            <SkeletonProfile />
          </div>
        );

      case 'notifications':
        return (
          <div className="demo-section">
            <h3>Bildirim Skeleton Bileşenleri</h3>
            <div className="demo-grid">
              <SkeletonNotification />
              <SkeletonNotification />
              <SkeletonNotification />
            </div>
          </div>
        );

      case 'calendar':
        return (
          <div className="demo-section">
            <h3>Takvim Skeleton Bileşeni</h3>
            <SkeletonCalendar />
          </div>
        );

      case 'charts':
        return (
          <div className="demo-section">
            <h3>Grafik Skeleton Bileşeni</h3>
            <SkeletonChart />
          </div>
        );

      case 'loading':
        return (
          <div className="demo-section">
            <h3>Loading State Bileşeni</h3>
            <div className="demo-controls">
              <button onClick={handleRefresh} className="demo-button">
                <RefreshCw className="icon-small" />
                Loading Göster
              </button>
              <button onClick={handleError} className="demo-button demo-button-error">
                Hata Göster
              </button>
            </div>
            <LoadingState
              isLoading={isLoading}
              error={error}
              onRetry={() => setError(null)}
              skeleton={<SkeletonDashboard />}
            >
              <div className="demo-content">
                <h4>Başarılı İçerik</h4>
                <p>Bu içerik başarıyla yüklendi ve görüntüleniyor.</p>
                <SkeletonCard />
              </div>
            </LoadingState>
          </div>
        );

      default:
        return null;
    }
  };

  const breadcrumb = [
    { label: 'Ana Sayfa', path: '/admin' },
    { label: 'Skeleton Demo' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Skeleton Demo"
      breadcrumb={breadcrumb}
    >
      <div className="skeleton-demo-page">
        <div className="page-description">
          <p>Skeleton loading bileşenlerini test edin ve görüntüleyin</p>
        </div>

        {/* Navigation */}
        <nav className="demo-nav">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`demo-nav-button ${activeSection === section.id ? 'active' : ''}`}
            >
              <span className="demo-nav-icon">{section.icon}</span>
              <span>{section.name}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="demo-content-wrapper">
          {renderSection()}
        </div>
      </div>
    </ModernDashboardLayout>
  );
};

export default SkeletonDemoPage;
