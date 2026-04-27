import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Search, Menu, User, Filter, Grid, List } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useNavigation } from './NavigationProvider';
import { EnhancedBreadcrumbs } from './Breadcrumbs';

export const EnhancedTopNavigation: React.FC = () => {
  const { setSidebarOpen, setSearchOpen, searchOpen } = useNavigation();
  const { user } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
  };

  const toggleSearch = () => {
    setSearchOpen(!searchOpen);
    if (!searchOpen) {
      // Focus search input when opening
      setTimeout(() => {
        const searchInput = document.getElementById('global-search');
        if (searchInput) searchInput.focus();
      }, 100);
    }
  };

  return (
    <header className="enhanced-top-nav">
      <div className="nav-left">
        <button
          className="nav-menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Menüyü aç"
        >
          <Menu className="menu-icon" />
        </button>

        <div className="nav-brand">
          <GraduationCap className="brand-icon" />
          <span className="brand-text">Tofaş Fen Lisesi</span>
        </div>

        <EnhancedBreadcrumbs />
      </div>

      <div className="nav-center">
        <AnimatePresence>
          {searchOpen && (
            <motion.form
              className="nav-search"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              onSubmit={handleSearch}
            >
              <Search className="search-icon" />
              <input
                id="global-search"
                type="text"
                placeholder="Ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="search-btn">
                <Search className="search-submit-icon" />
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      <div className="nav-right">
        <div className="nav-actions">
          <button className="nav-action-btn" onClick={toggleSearch} aria-label="Arama">
            <Search className="action-icon" />
          </button>

          <button
            className="nav-action-btn"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            aria-label={`${viewMode === 'grid' ? 'Liste' : 'Grid'} görünümü`}
          >
            {viewMode === 'grid' ? (
              <List className="action-icon" />
            ) : (
              <Grid className="action-icon" />
            )}
          </button>

          <button
            className="nav-action-btn"
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Filtreler"
          >
            <Filter className="action-icon" />
          </button>
        </div>

        <div className="nav-user">
          <div className="user-menu">
            <div className="user-avatar">
              <User className="avatar-icon" />
            </div>
            <span className="user-name">{user?.adSoyad || 'Kullanıcı'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
