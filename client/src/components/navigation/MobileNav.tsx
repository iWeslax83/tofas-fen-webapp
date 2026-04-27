import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, BookOpen, Award, User, X } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useNavigation } from './NavigationProvider';
import { getRoleDisplayName } from './types';
import { EnhancedSidebar } from './Sidebar';

export const MobileNavigation: React.FC = () => {
  const { mobileMenuOpen, setMobileMenuOpen, currentPath } = useNavigation();
  const { user } = useAuthContext();
  const [, setActiveTab] = useState('home');

  const navigationTabs = [
    { key: 'home', label: 'Ana Sayfa', icon: Home, path: `/${String(user?.rol || 'student')}` },
    {
      key: 'academic',
      label: 'Akademik',
      icon: BookOpen,
      path: `/${String(user?.rol || 'student')}/odevler`,
    },
    {
      key: 'activities',
      label: 'Aktiviteler',
      icon: Award,
      path: `/${String(user?.rol || 'student')}/kuluplerim`,
    },
  ];

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
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        {navigationTabs.map((tab) => (
          <Link
            key={tab.key}
            to={tab.path}
            className={`mobile-nav-item ${isActive(tab.path) ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon className="mobile-nav-icon" />
            <span className="mobile-nav-label">{tab.label}</span>
          </Link>
        ))}
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="mobile-menu-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              className="mobile-menu"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mobile-menu-header">
                <div className="mobile-user-info">
                  <div className="mobile-user-avatar">
                    <User className="avatar-icon" />
                  </div>
                  <div className="mobile-user-details">
                    <span className="mobile-user-name">{user?.adSoyad || 'Kullanıcı'}</span>
                    <span className="mobile-user-role">{getRoleDisplayName(user?.rol)}</span>
                  </div>
                </div>
                <button className="mobile-menu-close" onClick={() => setMobileMenuOpen(false)}>
                  <X className="close-icon" />
                </button>
              </div>

              <div className="mobile-menu-content">
                <EnhancedSidebar />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
