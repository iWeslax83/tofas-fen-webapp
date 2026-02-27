import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Home,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { dashboardButtons } from '../pages/Dashboard/dashboardButtonConfig';
import './ModernDashboardLayout.css';

interface ModernDashboardLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
  breadcrumb?: Array<{ label: string; path?: string }>;
  showSidebar?: boolean;
  customHeaderActions?: React.ReactNode;
}

export const ModernDashboardLayout: React.FC<ModernDashboardLayoutProps> = ({
  children,
  pageTitle,
  breadcrumb = [],
  showSidebar = true,
  customHeaderActions
}) => {
  const { user } = useAuthContext();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 1024);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // getRoleDisplayName function removed as not used

  const getRoleBasedButtons = () => {
    const role = user?.rol || 'student';
    return dashboardButtons.filter(btn => {
      if (!btn.roles.includes(role)) return false;
      if (btn.showForDormitory && !user?.pansiyon) return false;
      return true;
    });
  };

  const roleButtons = getRoleBasedButtons();

  const closeSidebarOnMobile = () => {
    if (window.innerWidth <= 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="modern-dashboard">
      {/* Mobile Menu Button */}
      <button
        className="mobile-menu-button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      {showSidebar && (
        <aside className={`modern-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <img src="/tofaslogo.png" alt="Tofaş Fen Lisesi" className="logo-image" width="36" height="36" />
              <div className="logo-text">
                <h2>Tofaş Fen Lisesi</h2>
                <span>Bilgi Sistemi</span>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section">
              <h3>Ana Menü</h3>
              <Link to={`/${user?.rol || 'student'}`} className="nav-item" onClick={closeSidebarOnMobile}>
                <Home className="nav-icon" />
                <span>Ana Sayfa</span>
              </Link>


            </div>

            <div className="nav-section">
              <h3>Hızlı Erişim</h3>
              {roleButtons.map((button) => (
                <Link key={button.key} to={button.route} className="nav-item" onClick={closeSidebarOnMobile}>
                  {button.icon && <button.icon className="nav-icon" />}
                  <span>{button.title}</span>
                </Link>
              ))}
            </div>

            <div className="nav-section">
              <h3>Sistem</h3>
              <Link to={`/${user.rol}/ayarlar`} className="nav-item" onClick={closeSidebarOnMobile}>
                <Settings className="nav-icon" />
                <span>Ayarlar</span>
              </Link>
            </div>
          </nav>
        </aside>
      )}

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay-mobile" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="main-content">
        {/* Top Header */}
        <header className="modern-header">
          <div className="header-left">
            <div className="breadcrumb">
              {breadcrumb.length > 0 ? (
                breadcrumb.map((item, index) => (
                  <React.Fragment key={index}>
                    {item.path ? (
                      <Link to={item.path} className="breadcrumb-link">
                        {item.label}
                      </Link>
                    ) : (
                      <span>{item.label}</span>
                    )}
                    {index < breadcrumb.length - 1 && (
                      <span className="separator">/</span>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <>
                  <span>Ana Sayfa</span>
                  <span className="separator">/</span>
                  <span>{pageTitle}</span>
                </>
              )}
            </div>
          </div>
          <div className="header-right">
            {customHeaderActions}
          </div>
        </header>

        {/* Page Content */}
        <main className="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ModernDashboardLayout;
