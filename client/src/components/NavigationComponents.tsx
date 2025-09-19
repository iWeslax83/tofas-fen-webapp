import React, { useState, useEffect, createContext, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  Home, 
  Settings, 
  LogOut, 
  Bell, 
  Search, 
  Menu, 
  X, 
  ChevronRight, 
  ChevronDown,
  User,
  HelpCircle,
  BarChart3,
  Calendar,
  FileText,
  Users,
  BookOpen,
  ClipboardList,
  Award,
  Activity,
  MessageSquare,
  Folder,
  Wrench,
  Utensils,
  Star,
  Crown,
  Shield,
  Zap,
  Filter,
  Grid,
  List
} from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { dashboardButtons } from '../pages/Dashboard/dashboardButtonConfig';
import './NavigationComponents.css';
import NotificationBell from './NotificationBell';

// Navigation Context
interface NavigationContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  currentPath: string;
  breadcrumbs: BreadcrumbItem[];
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};

// Types
interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ElementType;
}

interface NavigationItem {
  key: string;
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: string | number;
  children?: NavigationItem[];
  roles: string[];
  color?: string;
  description?: string;
}

interface NavigationProviderProps {
  children: React.ReactNode;
}

// Navigation Provider Component
export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Ana Sayfa', path: '/', icon: Home }
    ];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Map segment to readable label
      const label = getSegmentLabel(segment, index === 0);
      const icon = getSegmentIcon(segment);
      
      breadcrumbs.push({
        label,
        path: currentPath,
        icon
      });
    });

    return breadcrumbs;
  };

  const getSegmentLabel = (segment: string): string => {
    const labelMap: Record<string, string> = {
      admin: 'Yönetici Paneli',
      teacher: 'Öğretmen Paneli',
      student: 'Öğrenci Paneli',
      parent: 'Veli Paneli',
      hizmetli: 'Hizmetli Paneli',
      odevler: 'Ödevler',
      'ders-programi': 'Ders Programı',
      notlar: 'Notlar',
      duyurular: 'Duyurular',
      kuluplerim: 'Kulüplerim',
      evci: 'Evci Bilgileri',
      'yemek-listesi': 'Yemek Listesi',
      'belletmen-listesi': 'Belletmen Listesi',
      'bakim-talepleri': 'Bakım Talepleri',
      ogrencilerim: 'Öğrencilerim',
      kulupler: 'Kulüpler',
      'evci-listesi': 'Evci Listesi',
      senkronizasyon: 'Senkronizasyon',
      analytics: 'Analytics',
      reports: 'Raporlar',
      takvim: 'Takvim',
      dosyalar: 'Dosyalar',
      iletisim: 'İletişim',
      performans: 'Performans',
      ayarlar: 'Ayarlar',
      yardim: 'Yardım',
      help: 'Yardım'
    };

    return labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  const getSegmentIcon = (segment: string): React.ElementType => {
    const iconMap: Record<string, React.ElementType> = {
      admin: Crown,
      teacher: User,
      student: GraduationCap,
      parent: Users,
      hizmetli: Shield,
      odevler: BookOpen,
      'ders-programi': Calendar,
      notlar: FileText,
      duyurular: Bell,
      kuluplerim: Award,
      evci: ClipboardList,
      'yemek-listesi': Utensils,
      'belletmen-listesi': Users,
      'bakim-talepleri': Wrench,
      ogrencilerim: Users,
      kulupler: Award,
      'evci-listesi': ClipboardList,
      senkronizasyon: Zap,
      analytics: BarChart3,
      reports: FileText,
      takvim: Calendar,
      dosyalar: Folder,
      iletisim: MessageSquare,
      performans: Activity,
      ayarlar: Settings,
      yardim: HelpCircle,
      help: HelpCircle
    };

    return iconMap[segment] || Home;
  };

  const breadcrumbs = generateBreadcrumbs(location.pathname);

  const contextValue: NavigationContextType = {
    sidebarOpen,
    setSidebarOpen,
    mobileMenuOpen,
    setMobileMenuOpen,
    searchOpen,
    setSearchOpen,
    currentPath: location.pathname,
    breadcrumbs
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
};

// Enhanced Sidebar Component
export const EnhancedSidebar: React.FC = () => {
  const { sidebarOpen, setSidebarOpen, currentPath } = useNavigation();
  const { user } = useAuthContext();
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
        roles: ['admin', 'teacher', 'student', 'parent', 'hizmetli'],
        color: 'blue'
      }
    ];

    // Add role-specific items
    const roleItems = dashboardButtons
      .filter(btn => btn.roles.includes(role))
      .map(btn => ({
        key: btn.key,
        label: btn.title,
        path: btn.route,
        icon: btn.icon || Home,
        roles: btn.roles,
        color: btn.color,
        description: btn.description
      }));

    return [...baseItems, ...roleItems];
  };

  const navigationItems = getNavigationItems();

  // Group items by category
  const groupedItems = navigationItems.reduce((acc, item) => {
    const category = getItemCategory(item);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, NavigationItem[]>);

  const getItemCategory = (item: NavigationItem): string => {
    if (item.key === 'dashboard') return 'main';
    if (['odevler', 'notlar', 'ders-programi'].includes(item.key)) return 'academic';
    if (['duyurular', 'kuluplerim', 'kulupler'].includes(item.key)) return 'activities';
    if (['yemek-listesi', 'belletmen-listesi', 'bakim-talepleri'].includes(item.key)) return 'dormitory';
    if (['analytics', 'reports', 'senkronizasyon'].includes(item.key)) return 'admin';
    if (['takvim', 'dosyalar', 'iletisim', 'performans'].includes(item.key)) return 'tools';
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
      other: 'Diğer'
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
      tools: Settings,
      other: Star
    };
    return icons[category] || Star;
  };

  const toggleSection = (category: string) => {
    setCollapsedSections(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleFavorite = (itemKey: string) => {
    setFavorites(prev => 
      prev.includes(itemKey)
        ? prev.filter(key => key !== itemKey)
        : [...prev, itemKey]
    );
  };

  const isActive = (path: string) => {
    // Debug logging
    console.log('isActive check:', { path, currentPath, userRole: user?.rol });
    
    // Exact match
    if (currentPath === path) {
      console.log('Exact match found:', path);
      return true;
    }
    
    // For role-based routes, check if current path starts with the route
    if (path !== '/' && currentPath.startsWith(path + '/')) {
      console.log('Path starts with match found:', path);
      return true;
    }
    
    // Special case for dashboard home routes
    if (path === `/${user?.rol}` && currentPath === `/${user?.rol}`) {
      console.log('Dashboard home match found:', path);
      return true;
    }
    
    // Special case for exact matches with trailing slash
    if (currentPath === path + '/') {
      console.log('Trailing slash match found:', path);
      return true;
    }
    
    console.log('No match found for:', path);
    return false;
  };

  return (
    <motion.aside 
      className={`enhanced-sidebar ${sidebarOpen ? 'open' : ''}`}
      initial={{ x: -300 }}
      animate={{ x: sidebarOpen ? 0 : -300 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
            {favorites.map(favKey => {
              const item = navigationItems.find(nav => nav.key === favKey);
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
              {(() => { const CategoryIcon = getCategoryIcon(category); return <CategoryIcon className="section-icon" />; })()}
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
                        <Star className={`favorite-icon ${favorites.includes(item.key) ? 'filled' : ''}`} />
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
          <Link to="/ayarlar" className="footer-action">
            <Settings className="action-icon" />
          </Link>
          <Link to="/yardim" className="footer-action">
            <HelpCircle className="action-icon" />
          </Link>
          <button className="footer-action logout" onClick={() => window.location.href = '/login'}>
            <LogOut className="action-icon" />
          </button>
        </div>
      </div>
    </motion.aside>
  );
};

// Enhanced Breadcrumbs Component
export const EnhancedBreadcrumbs: React.FC = () => {
  const { breadcrumbs } = useNavigation();

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="enhanced-breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const Icon = crumb.icon;
          
          return (
            <li key={crumb.path} className="breadcrumb-item">
              {isLast ? (
                <span className="breadcrumb-current">
                  <Icon className="breadcrumb-icon" />
                  <span className="breadcrumb-label">{crumb.label}</span>
                </span>
              ) : (
                <Link to={crumb.path} className="breadcrumb-link">
                  <Icon className="breadcrumb-icon" />
                  <span className="breadcrumb-label">{crumb.label}</span>
                </Link>
              )}
              {!isLast && (
                <ChevronRight className="breadcrumb-separator" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

// Enhanced Top Navigation Component
export const EnhancedTopNavigation: React.FC = () => {
  const { setSidebarOpen, setSearchOpen, searchOpen } = useNavigation();
  const { user } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log('Searching for:', searchQuery);
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
          <button
            className="nav-action-btn"
            onClick={toggleSearch}
            aria-label="Arama"
          >
            <Search className="action-icon" />
          </button>
          
          <button
            className="nav-action-btn"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            aria-label={`${viewMode === 'grid' ? 'Liste' : 'Grid'} görünümü`}
          >
            {viewMode === 'grid' ? <List className="action-icon" /> : <Grid className="action-icon" />}
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
          <NotificationBell userId={user?.id || ''} />
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

// Mobile Navigation Component
export const MobileNavigation: React.FC = () => {
  const { mobileMenuOpen, setMobileMenuOpen, currentPath } = useNavigation();
  const { user } = useAuthContext();
  const [, setActiveTab] = useState('home');

  const navigationTabs = [
    { key: 'home', label: 'Ana Sayfa', icon: Home, path: `/${user?.rol || 'student'}` },
    { key: 'academic', label: 'Akademik', icon: BookOpen, path: `/${user?.rol || 'student'}/odevler` },
    { key: 'activities', label: 'Aktiviteler', icon: Award, path: `/${user?.rol || 'student'}/kuluplerim` },
    { key: 'notifications', label: 'Bildirimler', icon: Bell, path: '/bildirimler' },
  ];

  const isActive = (path: string) => {
    // Debug logging
    console.log('isActive check:', { path, currentPath, userRole: user?.rol });
    
    // Exact match
    if (currentPath === path) {
      console.log('Exact match found:', path);
      return true;
    }
    
    // For role-based routes, check if current path starts with the route
    if (path !== '/' && currentPath.startsWith(path + '/')) {
      console.log('Path starts with match found:', path);
      return true;
    }
    
    // Special case for dashboard home routes
    if (path === `/${user?.rol}` && currentPath === `/${user?.rol}`) {
      console.log('Dashboard home match found:', path);
      return true;
    }
    
    // Special case for exact matches with trailing slash
    if (currentPath === path + '/') {
      console.log('Trailing slash match found:', path);
      return true;
    }
    
    console.log('No match found for:', path);
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
                <button
                  className="mobile-menu-close"
                  onClick={() => setMobileMenuOpen(false)}
                >
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

// Navigation Analytics Component
export const NavigationAnalytics: React.FC = () => {
  const { currentPath } = useNavigation();
  const [analytics, setAnalytics] = useState({
    pageViews: 0,
    navigationTime: 0,
    userPath: [] as string[]
  });

  useEffect(() => {
    // Track page view
    setAnalytics(prev => ({
      ...prev,
      pageViews: prev.pageViews + 1,
      userPath: [...prev.userPath, currentPath]
    }));

    // Track navigation time
    const startTime = Date.now();
    return () => {
      const endTime = Date.now();
      setAnalytics(prev => ({
        ...prev,
        navigationTime: prev.navigationTime + (endTime - startTime)
      }));
    };
  }, [currentPath]);

  // Send analytics to backend (in production)
  useEffect(() => {
    if (analytics.pageViews > 0) {
      // sendAnalytics(analytics);
    }
  }, [analytics]);

  return null; // This component doesn't render anything visible
};

// Utility Functions
const getRoleDisplayName = (role?: string): string => {
  switch (role) {
    case 'admin': return 'Yönetici';
    case 'student': return 'Öğrenci';
    case 'teacher': return 'Öğretmen';
    case 'parent': return 'Veli';
    case 'hizmetli': return 'Hizmetli';
    default: return 'Kullanıcı';
  }
};

// (Removed duplicate export block; components are already exported via named exports above)
