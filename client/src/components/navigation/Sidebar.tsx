import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Home,
  LogOut,
  Star,
  Crown,
  Shield,
  BookOpen,
  Award,
  Wrench,
  ChevronDown,
  User,
  HelpCircle,
  X,
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { dashboardButtons } from '../../pages/Dashboard/dashboardButtonConfig';
import { useNavigation } from './NavigationProvider';
import { getRoleDisplayName } from './types';
import type { NavigationItem } from './types';

export const EnhancedSidebar: React.FC = () => {
  const { sidebarOpen, setSidebarOpen, currentPath } = useNavigation();
  const { user, logout } = useAuthContext();
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Get role-specific navigation items
  const getNavigationItems = (): NavigationItem[] => {
    const role = user?.rol || 'student';

    const baseItems: NavigationItem[] = [
      {
        key: 'dashboard',
        label: 'Ana Sayfa',
        path: `/${role}`,
        icon: Home,
        roles: ['admin', 'teacher', 'student', 'parent', 'ziyaretci'],
        color: 'blue',
      },
    ];

    // Add role-specific items
    const roleItems = dashboardButtons
      .filter((btn) => {
        if (!btn.roles.includes(role)) return false;
        if (btn.showForDormitory && !user?.pansiyon) return false;
        return true;
      })
      .map((btn) => ({
        key: btn.key,
        label: btn.title,
        path: btn.route,
        icon: btn.icon || Home,
        roles: btn.roles,
        color: btn.color || '#6b7280',
        description: btn.description,
      }));

    return [...baseItems, ...roleItems];
  };

  const navigationItems = getNavigationItems();

  // Group items by category
  const groupedItems = navigationItems.reduce(
    (acc, item) => {
      const category = getItemCategory(item);
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, NavigationItem[]>,
  );

  const getItemCategory = (item: NavigationItem): string => {
    if (item.key === 'dashboard') return 'main';
    if (['odevler', 'notlar', 'ders-programi'].includes(item.key)) return 'academic';
    if (['duyurular', 'kuluplerim', 'kulupler'].includes(item.key)) return 'activities';
    if (['yemek-listesi', 'belletmen-listesi', 'bakim-talepleri'].includes(item.key))
      return 'dormitory';
    if (['senkronizasyon'].includes(item.key)) return 'admin';
    if (['takvim', 'iletisim', 'performans'].includes(item.key)) return 'tools';
    return 'other';
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      main: 'Ana Menü',
      academic: 'Akademik',
      activities: 'Aktiviteler',
      dormitory: 'Pansiyon',
      admin: 'Yönetim',
      tools: 'Araçlar',
      other: 'Diğer',
    };
    return labels[category] || 'Diğer';
  };

  const getCategoryIcon = (category: string): React.ElementType => {
    const icons: Record<string, React.ElementType> = {
      main: Home,
      academic: BookOpen,
      activities: Award,
      dormitory: Shield,
      admin: Crown,
      tools: Wrench,
      other: Star,
    };
    return icons[category] || Star;
  };

  const toggleSection = (category: string) => {
    setCollapsedSections((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  };

  const toggleFavorite = (itemKey: string) => {
    setFavorites((prev) =>
      prev.includes(itemKey) ? prev.filter((key) => key !== itemKey) : [...prev, itemKey],
    );
  };

  const isActive = (path: string) => {
    // Exact match
    if (currentPath === path) {
      return true;
    }

    // For role-based routes, check if current path starts with the route
    if (path !== '/' && currentPath.startsWith(path + '/')) {
      return true;
    }

    // Special case for dashboard home routes
    if (path === `/${String(user?.rol || '')}` && currentPath === `/${String(user?.rol || '')}`) {
      return true;
    }

    // Special case for exact matches with trailing slash
    if (currentPath === path + '/') {
      return true;
    }

    return false;
  };

  return (
    <motion.aside
      className={`enhanced-sidebar ${sidebarOpen ? 'open' : ''}`}
      initial={{ x: -300 }}
      animate={{ x: sidebarOpen ? 0 : -300 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <GraduationCap className="logo-icon" />
          <div className="logo-text">
            <h2>Tofaş Fen</h2>
            <span>Lisesi</span>
          </div>
        </div>
        <button
          className="sidebar-close"
          onClick={() => setSidebarOpen(false)}
          aria-label="Sidebar'ı kapat"
        >
          <X className="close-icon" />
        </button>
      </div>

      {/* Favorites Section */}
      {favorites.length > 0 && (
        <div className="sidebar-section">
          <div className="section-header">
            <Star className="section-icon" />
            <span>Favoriler</span>
          </div>
          <div className="section-content">
            {favorites.map((favKey) => {
              const item = navigationItems.find((nav) => nav.key === favKey);
              if (!item) return null;

              return (
                <Link
                  key={item.key}
                  to={item.path}
                  className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                  <button
                    className="nav-favorite-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFavorite(item.key);
                    }}
                  >
                    <Star className="favorite-icon filled" />
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Sections */}
      <nav className="sidebar-nav">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="sidebar-section">
            <button
              className="section-header"
              onClick={() => toggleSection(category)}
              aria-expanded={!collapsedSections.includes(category)}
            >
              {(() => {
                const CategoryIcon = getCategoryIcon(category);
                return <CategoryIcon className="section-icon" />;
              })()}
              <span>{getCategoryLabel(category)}</span>
              <ChevronDown
                className={`section-chevron ${collapsedSections.includes(category) ? 'collapsed' : ''}`}
              />
            </button>

            <AnimatePresence>
              {!collapsedSections.includes(category) && (
                <motion.div
                  className="section-content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {items.map((item) => (
                    <Link
                      key={item.key}
                      to={item.path}
                      className={`nav-item ${isActive(item.path) ? 'active' : ''} ${item.color || ''}`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="nav-icon" />
                      <span className="nav-label">{item.label}</span>
                      <button
                        className="nav-favorite-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFavorite(item.key);
                        }}
                      >
                        <Star
                          className={`favorite-icon ${favorites.includes(item.key) ? 'filled' : ''}`}
                        />
                      </button>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            <User className="avatar-icon" />
          </div>
          <div className="user-details">
            <span className="user-name">{user?.adSoyad || 'Kullanıcı'}</span>
            <span className="user-role">{getRoleDisplayName(user?.rol)}</span>
          </div>
        </div>

        <div className="footer-actions">
          <Link to="/yardim" className="footer-action">
            <HelpCircle className="action-icon" />
          </Link>
          <button className="footer-action logout" onClick={logout}>
            <LogOut className="action-icon" />
          </button>
        </div>
      </div>
    </motion.aside>
  );
};
