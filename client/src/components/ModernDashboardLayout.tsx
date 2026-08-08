import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Home, Settings, Menu, X, Bell, CheckCheck, Search } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuthContext } from '../contexts/AuthContext';
import { useInitialized } from '../stores/authStore';
import { dashboardButtons, type UserRole } from '../pages/Dashboard/dashboardButtonConfig';
import { useNotifications } from '../hooks/useNotifications';
import { SidebarProfile } from './SidebarProfile';

/** Menü ipucunun bir kez gösterilip kapatıldığını hatırlayan anahtar. */
const MENU_IPUCU_KEY = 'tofas_menu_ipucu';
import { CommandPalette } from './CommandPalette';
import './ModernDashboardLayout.css';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Yönetici',
  teacher: 'Öğretmen',
  student: 'Öğrenci',
  parent: 'Veli',
  hizmetli: 'Hizmetli',
  ziyaretci: 'Ziyaretçi',
};

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
  const initialized = useInitialized();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 1024);
  const [menuIpucuHakki, setMenuIpucuHakki] = useState(
    () => window.innerWidth <= 1024 && localStorage.getItem(MENU_IPUCU_KEY) !== 'goruldu',
  );
  // Girişten hemen sonra "Giriş başarılı" bildirimi ekranın aynı köşesinde
  // duruyor. İpucu onun altında kalmasın diye bildirim kapandıktan sonra çıkıyor.
  const [menuIpucuGorunsun, setMenuIpucuGorunsun] = useState(false);

  useEffect(() => {
    if (!menuIpucuHakki) return;
    const zaman = setTimeout(() => setMenuIpucuGorunsun(true), 4500);
    return () => clearTimeout(zaman);
  }, [menuIpucuHakki]);

  const menuIpucunuKapat = useCallback(() => {
    localStorage.setItem(MENU_IPUCU_KEY, 'goruldu');
    setMenuIpucuHakki(false);
    setMenuIpucuGorunsun(false);
  }, []);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { notifications, unreadCount, isOpen, setIsOpen, markAsRead, markAllAsRead } =
    useNotifications(user?.id, initialized && !!user);
  const notifRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const navClass = (to: string) => `nav-item${pathname === to ? ' active' : ''}`;

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

  const navSections = useMemo(() => {
    const role = user?.rol || 'student';
    const visible = dashboardButtons.filter((btn) => {
      if (!btn.roles.includes(role)) return false;
      if (btn.showForDormitory && !user?.pansiyon) return false;
      return true;
    });
    return [
      {
        key: 'quick',
        label: 'Hızlı Erişim',
        items: visible.filter((b) => (b.section ?? 'quick') === 'quick'),
      },
      {
        key: 'dormitory',
        label: 'Pansiyon',
        items: visible.filter((b) => b.section === 'dormitory'),
      },
      {
        key: 'registration',
        label: 'Yeni Kayıt',
        items: visible.filter((b) => b.section === 'registration'),
      },
      { key: 'system', label: 'Sistem', items: visible.filter((b) => b.section === 'system') },
    ].filter((s) => s.key === 'system' || s.items.length > 0);
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
      {/* Mobile Menu Button */}
      <button
        className="mobile-menu-button"
        aria-label={sidebarOpen ? 'Menüyü kapat' : 'Menüyü aç'}
        aria-expanded={sidebarOpen}
        onClick={() => {
          menuIpucunuKapat();
          setSidebarOpen(!sidebarOpen);
        }}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Telefonda sayfaların tamamı bu menünün arkasında duruyor. İlk girişte
          menüyü fark etmeyen kullanıcılar uygulamayı boş sanıyordu. */}
      {menuIpucuGorunsun && !sidebarOpen && (
        <div className="menu-ipucu" role="note">
          <p className="menu-ipucu-metin">
            Ödevler, notlar, duyurular ve diğer sayfalar soldaki menüde. Menüyü açmak için
            yukarıdaki düğmeye dokun.
          </p>
          <button type="button" className="menu-ipucu-kapat" onClick={menuIpucunuKapat}>
            Anladım
          </button>
        </div>
      )}

      {/* Sidebar */}
      {showSidebar && (
        <aside className={`modern-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <img
                src="/tofaslogo.png"
                alt="Tofaş Fen Lisesi"
                className="logo-image"
                width="250"
                height="298"
              />
              <div className="logo-text">
                <h2>Tofaş Fen Lisesi</h2>
                <span>Bilgi Sistemi</span>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section">
              <h3>Ana Menü</h3>
              <Link
                to={`/${user?.rol || 'student'}`}
                className={navClass(`/${user?.rol || 'student'}`)}
                onClick={closeSidebarOnMobile}
              >
                <Home className="nav-icon" />
                <span>Ana Sayfa</span>
              </Link>
            </div>

            {navSections.map((section) => (
              <div className="nav-section" key={section.key}>
                <h3>{section.label}</h3>
                {section.items.map((button) => (
                  <Link
                    key={button.key}
                    to={button.route}
                    className={navClass(button.route)}
                    onClick={closeSidebarOnMobile}
                  >
                    {button.icon && <button.icon className="nav-icon" />}
                    <span>{button.title}</span>
                  </Link>
                ))}
                {section.key === 'system' && (
                  <Link
                    to={`/${user.rol}/ayarlar`}
                    className={navClass(`/${user.rol}/ayarlar`)}
                    onClick={closeSidebarOnMobile}
                  >
                    <Settings className="nav-icon" />
                    <span>Ayarlar</span>
                  </Link>
                )}
              </div>
            ))}
          </nav>

          <SidebarProfile
            name={user.adSoyad ?? user.id}
            userId={user.id}
            role={user.rol ?? 'student'}
            pansiyon={user.pansiyon}
          />
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
          <h1 className="header-page-title">{pageTitle}</h1>

          <div className="header-utility-row">
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
            <motion.button
              type="button"
              className="global-search"
              onClick={() => setPaletteOpen(true)}
              aria-label="Komut paletini aç (Ctrl+K)"
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <Search size={16} className="global-search-ico" />
              <span>Öğrenci, ders, duyuru ara…</span>
              <kbd className="global-search-kbd">⌘K</kbd>
            </motion.button>

            <div className="header-right">
              {customHeaderActions}
              {/* Global search collapses to icon-only below 1024px (.global-search
                  is hidden there) — this is the only way touch users reach the
                  command palette, Cmd/Ctrl+K has no mobile equivalent. */}
              <button
                type="button"
                className="mobile-search-button"
                onClick={() => setPaletteOpen(true)}
                aria-label="Ara (Komut paletini aç)"
              >
                <Search size={18} />
              </button>
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
                        <AnimatePresence initial={!reduceMotion}>
                          {notifications.map((n, index) => (
                            <motion.button
                              key={n._id}
                              className={`notif-item${n.read ? '' : ' unread'}`}
                              onClick={() => {
                                if (!n.read) markAsRead(n._id);
                                if (n.actionUrl) {
                                  navigate(n.actionUrl);
                                  setIsOpen(false);
                                }
                              }}
                              initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={
                                reduceMotion
                                  ? { duration: 0 }
                                  : { duration: 0.15, delay: Math.min(index, 5) * 0.015 }
                              }
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
                            </motion.button>
                          ))}
                        </AnimatePresence>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
