import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Home, Settings, Menu, X, Bell, CheckCheck, Search } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { dashboardButtons, type UserRole } from '../pages/Dashboard/dashboardButtonConfig';
import { useNotifications } from '../hooks/useNotifications';
import { ThemeToggle } from './ThemeToggle';
import { StateBar } from './StateBar';
import { SidebarProfile } from './SidebarProfile';
import { CommandPalette } from './CommandPalette';
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
  customHeaderActions,
}) => {
  const { user } = useAuthContext();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 1024);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { notifications, unreadCount, isOpen, setIsOpen, markAsRead, markAllAsRead } =
    useNotifications(user?.id);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Dışarı tıklayınca dropdown'ı kapat
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [setIsOpen]);

  const roleButtons = useMemo(() => {
    const role = user?.rol || 'student';
    return dashboardButtons.filter((btn) => {
      if (!btn.roles.includes(role)) return false;
      if (btn.showForDormitory && !user?.pansiyon) return false;
      return true;
    });
  }, [user?.rol, user?.pansiyon]);

  // Guard must be AFTER all hooks to avoid "fewer hooks" error on logout
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const closeSidebarOnMobile = () => {
    if (window.innerWidth <= 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="modern-dashboard">
      <StateBar />

      {/* Mobile Menu Button */}
      <button className="mobile-menu-button" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      {showSidebar && (
        <aside className={`modern-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <img
                src="/tofaslogo.png"
                alt="Tofaş Fen Lisesi"
                className="logo-image"
                width="36"
                height="36"
              />
              <div className="logo-text">
                <h2>Tofaş Fen Lisesi</h2>
                <span>Bilgi Sistemi</span>
              </div>
            </div>
          </div>

          <SidebarProfile
            name={user.adSoyad ?? user.id}
            userId={user.id}
            role={user.rol ?? 'student'}
            pansiyon={user.pansiyon}
          />

          <nav className="sidebar-nav">
            <div className="nav-section">
              <h3>Ana Menü</h3>
              <Link
                to={`/${user?.rol || 'student'}`}
                className="nav-item"
                onClick={closeSidebarOnMobile}
              >
                <Home className="nav-icon" />
                <span>Ana Sayfa</span>
              </Link>
            </div>

            <div className="nav-section">
              <h3>Hızlı Erişim</h3>
              {roleButtons.map((button) => (
                <Link
                  key={button.key}
                  to={button.route}
                  className="nav-item"
                  onClick={closeSidebarOnMobile}
                >
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
                    {index < breadcrumb.length - 1 && <span className="separator">/</span>}
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
            <button
              type="button"
              className="notif-bell-btn"
              onClick={() => setPaletteOpen(true)}
              aria-label="Komut paletini aç (Ctrl+K)"
              title="Komut paleti · Ctrl+K"
            >
              <Search size={20} />
            </button>
            <ThemeToggle />
            {/* Notification Bell */}
            <div className="notif-container" ref={notifRef}>
              <button
                className="notif-bell-btn"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Bildirimler"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>

              {isOpen && (
                <div className="notif-dropdown">
                  <div className="notif-dropdown-header">
                    <span className="notif-dropdown-title">Bildirimler</span>
                    {unreadCount > 0 && (
                      <button className="notif-mark-all" onClick={markAllAsRead}>
                        <CheckCheck size={14} />
                        Tümünü oku
                      </button>
                    )}
                  </div>
                  <div className="notif-dropdown-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">Bildirim yok</div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n._id}
                          className={`notif-item${n.read ? '' : ' unread'}`}
                          onClick={() => {
                            if (!n.read) markAsRead(n._id);
                            if (n.actionUrl) {
                              navigate(n.actionUrl);
                              setIsOpen(false);
                            }
                          }}
                        >
                          <div className={`notif-item-dot ${n.read ? 'read' : ''}`} />
                          <div className="notif-item-content">
                            <span className="notif-item-title">{n.title}</span>
                            <span className="notif-item-msg">{n.message}</span>
                            <span className="notif-item-time">
                              {new Date(n.createdAt).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="dashboard-content">{children}</main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        role={(user.rol ?? 'student') as UserRole}
        pansiyon={user.pansiyon}
      />
    </div>
  );
};

export default ModernDashboardLayout;
