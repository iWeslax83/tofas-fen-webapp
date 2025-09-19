import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';
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
  const { user, logout } = useAuthContext();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!user) {
    return (
      <div className="centered-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  // getRoleDisplayName function removed as not used

  const getRoleBasedButtons = () => {
    const role = user?.rol || 'student';
    return dashboardButtons.filter(btn => btn.roles.includes(role));
  };

  const roleButtons = getRoleBasedButtons();

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
              <img src="/tofaslogo.png" alt="Tofaş Fen Lisesi" className="logo-image" />
              <div className="logo-text">
                <h2>Tofaş Fen</h2>
                <span>Lisesi</span>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section">
              <h3>Ana Menü</h3>
              <Link to={`/${user?.rol || 'student'}`} className="nav-item">
                <Home className="nav-icon" />
                <span>Ana Sayfa</span>
              </Link>


            </div>

            <div className="nav-section">
              <h3>Hızlı Erişim</h3>
              {roleButtons.map((button) => (
                <Link key={button.key} to={button.route} className="nav-item">
                  <button.icon className="nav-icon" />
                  <span>{button.title}</span>
                </Link>
              ))}
            </div>

            <div className="nav-section">
              <h3>Sistem</h3>
              <Link to="/ayarlar" className="nav-item">
                <Settings className="nav-icon" />
                <span>Ayarlar</span>
              </Link>
              <button onClick={logout} className="nav-item logout">
                <LogOut className="nav-icon" />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </nav>
        </aside>
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
            <NotificationBell userId={user.id} />
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
