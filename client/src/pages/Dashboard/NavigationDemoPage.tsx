import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  NavigationProvider, 
  EnhancedSidebar, 
  EnhancedTopNavigation, 
  EnhancedBreadcrumbs, 
  MobileNavigation, 
  NavigationAnalytics 
} from '../../components/NavigationComponents';
import { 
  // GraduationCap, // Not used
  BookOpen, 
  Users, 
  // Calendar, // Not used
  // FileText, // Not used
  Bell, 
  // Settings, // Not used
  BarChart3,
  Award,
  // Activity, // Not used
  // MessageSquare, // Not used
  // Folder, // Not used
  // Wrench, // Not used
  // Utensils, // Not used
  Star,
  Crown,
  // Shield, // Not used
  // Zap, // Not used
  Target,
  // Lightbulb, // Not used
  // Rocket, // Not used
  // Gem, // Not used
  ChevronRight,
  // ExternalLink, // Not used
  // Bookmark, // Not used
  Clock,
  TrendingUp,
  Filter,
  Grid,
  // List, // Not used
  Eye,
  // EyeOff, // Not used
  Home,
  User,
  // HelpCircle, // Not used
  // LogOut, // Not used
  Search,
  Menu,
  // X, // Not used
  // ChevronDown // Not used
} from 'lucide-react';
// import { useAuthContext } from '../../contexts/AuthContext'; // Not used
import './NavigationDemoPage.css';

interface DemoSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  component: React.ReactNode;
}

const NavigationDemoPage: React.FC = () => {
  // const { user } = useAuthContext(); // unused in demo
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  // const [currentPath, setCurrentPath] = useState('/admin/navigation-demo');
  // const [breadcrumbs] = useState([
  //   { label: 'Ana Sayfa', path: '/', icon: Home },
  //   { label: 'Yönetici Paneli', path: '/admin', icon: Crown },
  //   { label: 'Navigation Demo', path: '/admin/navigation-demo', icon: Menu }
  // ]);

  // Mock user data for demo
  // const mockUser = {
  //   id: 'demo-user-1',
  //   adSoyad: 'Demo Kullanıcı',
  //   email: 'demo@tofas.edu.tr',
  //   rol: 'admin' as const
  // };

  // Demo sections
  const demoSections: DemoSection[] = [
    {
      id: 'overview',
      title: 'Genel Bakış',
      description: 'Geliştirilmiş navigasyon sisteminin genel özellikleri',
      icon: Home,
      component: (
        <div className="demo-overview">
          <div className="overview-grid">
            <motion.div 
              className="overview-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="card-header">
                <EnhancedSidebar />
                <h3>Geliştirilmiş Sidebar</h3>
              </div>
              <div className="card-content">
                <ul>
                  <li>Kategorilere göre gruplandırılmış menü</li>
                  <li>Favori öğeler sistemi</li>
                  <li>Dinamik rol tabanlı navigasyon</li>
                  <li>Responsive tasarım</li>
                  <li>Animasyonlu geçişler</li>
                </ul>
              </div>
            </motion.div>

            <motion.div 
              className="overview-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="card-header">
                <EnhancedBreadcrumbs />
                <h3>Akıllı Breadcrumbs</h3>
              </div>
              <div className="card-content">
                <ul>
                  <li>Otomatik yol oluşturma</li>
                  <li>İkonlu navigasyon</li>
                  <li>Responsive görünüm</li>
                  <li>Erişilebilirlik desteği</li>
                  <li>Dinamik güncelleme</li>
                </ul>
              </div>
            </motion.div>

            <motion.div 
              className="overview-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="card-header">
                <EnhancedTopNavigation />
                <h3>Geliştirilmiş Üst Navigasyon</h3>
              </div>
              <div className="card-content">
                <ul>
                  <li>Global arama özelliği</li>
                  <li>Görünüm modları</li>
                  <li>Filtre seçenekleri</li>
                  <li>Bildirim entegrasyonu</li>
                  <li>Kullanıcı menüsü</li>
                </ul>
              </div>
            </motion.div>

            <motion.div 
              className="overview-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="card-header">
                <MobileNavigation />
                <h3>Mobil Navigasyon</h3>
              </div>
              <div className="card-content">
                <ul>
                  <li>Alt navigasyon çubuğu</li>
                  <li>Kaydırılabilir menü</li>
                  <li>Dokunmatik optimizasyon</li>
                  <li>Hızlı erişim sekmeleri</li>
                  <li>Responsive tasarım</li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      )
    },
    {
      id: 'sidebar',
      title: 'Sidebar Demo',
      description: 'Geliştirilmiş sidebar bileşeninin özellikleri',
      icon: Menu,
      component: (
        <div className="demo-sidebar">
          <div className="demo-controls">
            <button 
              className="demo-btn primary"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? 'Sidebar\'ı Kapat' : 'Sidebar\'ı Aç'}
            </button>
            <button 
              className="demo-btn secondary"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? 'Mobil Menüyü Kapat' : 'Mobil Menüyü Aç'}
            </button>
          </div>
          
          <div className="sidebar-features">
            <h3>Sidebar Özellikleri</h3>
            <div className="features-grid">
              <div className="feature-item">
                <Star className="feature-icon" />
                <h4>Favori Sistemi</h4>
                <p>En sık kullanılan menü öğelerini favorilere ekleyin</p>
              </div>
              <div className="feature-item">
                <Users className="feature-icon" />
                <h4>Rol Tabanlı Menü</h4>
                <p>Kullanıcı rolüne göre dinamik menü öğeleri</p>
              </div>
              <div className="feature-item">
                <Award className="feature-icon" />
                <h4>Kategori Grupları</h4>
                <p>Menü öğeleri mantıklı kategorilere ayrılmış</p>
              </div>
              <div className="feature-item">
                <Eye className="feature-icon" />
                <h4>Görünürlük Kontrolü</h4>
                <p>Menü bölümlerini açıp kapatabilme</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'breadcrumbs',
      title: 'Breadcrumbs Demo',
      description: 'Akıllı breadcrumb sisteminin özellikleri',
      icon: ChevronRight,
      component: (
        <div className="demo-breadcrumbs">
          <div className="breadcrumb-demo">
            <h3>Breadcrumb Örnekleri</h3>
            
            <div className="breadcrumb-examples">
              <div className="example-item">
                <h4>Basit Yol</h4>
                <nav className="enhanced-breadcrumbs" aria-label="Breadcrumb">
                  <ol className="breadcrumb-list">
                    <li className="breadcrumb-item">
                      <Link to="/" className="breadcrumb-link">
                        <Home className="breadcrumb-icon" />
                        <span className="breadcrumb-label">Ana Sayfa</span>
                      </Link>
                      <ChevronRight className="breadcrumb-separator" />
                    </li>
                    <li className="breadcrumb-item">
                      <span className="breadcrumb-current">
                        <Crown className="breadcrumb-icon" />
                        <span className="breadcrumb-label">Yönetici Paneli</span>
                      </span>
                    </li>
                  </ol>
                </nav>
              </div>

              <div className="example-item">
                <h4>Detaylı Yol</h4>
                <nav className="enhanced-breadcrumbs" aria-label="Breadcrumb">
                  <ol className="breadcrumb-list">
                    <li className="breadcrumb-item">
                      <Link to="/" className="breadcrumb-link">
                        <Home className="breadcrumb-icon" />
                        <span className="breadcrumb-label">Ana Sayfa</span>
                      </Link>
                      <ChevronRight className="breadcrumb-separator" />
                    </li>
                    <li className="breadcrumb-item">
                      <Link to="/admin" className="breadcrumb-link">
                        <Crown className="breadcrumb-icon" />
                        <span className="breadcrumb-label">Yönetici Paneli</span>
                      </Link>
                      <ChevronRight className="breadcrumb-separator" />
                    </li>
                    <li className="breadcrumb-item">
                      <Link to="/admin/kulupler" className="breadcrumb-link">
                        <Award className="breadcrumb-icon" />
                        <span className="breadcrumb-label">Kulüpler</span>
                      </Link>
                      <ChevronRight className="breadcrumb-separator" />
                    </li>
                    <li className="breadcrumb-item">
                      <span className="breadcrumb-current">
                        <Users className="breadcrumb-icon" />
                        <span className="breadcrumb-label">Matematik Kulübü</span>
                      </span>
                    </li>
                  </ol>
                </nav>
              </div>
            </div>

            <div className="breadcrumb-features">
              <h3>Breadcrumb Özellikleri</h3>
              <ul>
                <li>Otomatik yol oluşturma</li>
                <li>İkonlu navigasyon</li>
                <li>Responsive tasarım</li>
                <li>Erişilebilirlik desteği</li>
                <li>Dinamik güncelleme</li>
                <li>Hover efektleri</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'top-nav',
      title: 'Üst Navigasyon Demo',
      description: 'Geliştirilmiş üst navigasyon bileşeninin özellikleri',
      icon: TrendingUp,
      component: (
        <div className="demo-top-nav">
          <div className="top-nav-demo">
            <h3>Üst Navigasyon Özellikleri</h3>
            
            <div className="nav-features-grid">
              <div className="nav-feature">
                <Search className="feature-icon" />
                <h4>Global Arama</h4>
                <p>Sayfa içeriğinde hızlı arama yapın</p>
                <button 
                  className="demo-btn small"
                  onClick={() => setSearchOpen(!searchOpen)}
                >
                  {searchOpen ? 'Aramayı Kapat' : 'Aramayı Aç'}
                </button>
              </div>

              <div className="nav-feature">
                <Grid className="feature-icon" />
                <h4>Görünüm Modları</h4>
                <p>Grid ve liste görünümleri arasında geçiş</p>
                <button 
                  className="demo-btn small"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                >
                  {viewMode === 'grid' ? 'Liste Görünümü' : 'Grid Görünümü'}
                </button>
              </div>

              <div className="nav-feature">
                <Filter className="feature-icon" />
                <h4>Filtreler</h4>
                <p>İçerik filtreleme seçenekleri</p>
                <button 
                  className="demo-btn small"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? 'Filtreleri Kapat' : 'Filtreleri Aç'}
                </button>
              </div>

              <div className="nav-feature">
                <Bell className="feature-icon" />
                <h4>Bildirimler</h4>
                <p>Gerçek zamanlı bildirim sistemi</p>
                <div className="notification-demo">
                  <span className="notification-badge">3</span>
                  <span>Yeni bildirim</span>
                </div>
              </div>
            </div>

            {searchOpen && (
              <motion.div 
                className="search-demo"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="search-container">
                  <Search className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="Ara..." 
                    className="search-input"
                  />
                  <button className="search-btn">
                    <Search className="search-submit-icon" />
                  </button>
                </div>
              </motion.div>
            )}

            {showFilters && (
              <motion.div 
                className="filters-demo"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="filters-container">
                  <h4>Filtre Seçenekleri</h4>
                  <div className="filter-options">
                    <label className="filter-option">
                      <input type="checkbox" />
                      <span>Öğrenciler</span>
                    </label>
                    <label className="filter-option">
                      <input type="checkbox" />
                      <span>Öğretmenler</span>
                    </label>
                    <label className="filter-option">
                      <input type="checkbox" />
                      <span>Veliler</span>
                    </label>
                    <label className="filter-option">
                      <input type="checkbox" />
                      <span>Hizmetliler</span>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'mobile',
      title: 'Mobil Navigasyon Demo',
      description: 'Mobil navigasyon bileşeninin özellikleri',
      icon: Smartphone,
      component: (
        <div className="demo-mobile">
          <div className="mobile-demo">
            <h3>Mobil Navigasyon Özellikleri</h3>
            
            <div className="mobile-features">
              <div className="mobile-feature">
                <div className="feature-icon-container">
                  <Menu className="feature-icon" />
                </div>
                <h4>Alt Navigasyon</h4>
                <p>Hızlı erişim için alt navigasyon çubuğu</p>
              </div>

              <div className="mobile-feature">
                <div className="feature-icon-container">
                  <Users className="feature-icon" />
                </div>
                <h4>Kaydırılabilir Menü</h4>
                <p>Sağdan açılan tam ekran menü</p>
              </div>

              <div className="mobile-feature">
                <div className="feature-icon-container">
                  <Fingerprint className="feature-icon" />
                </div>
                <h4>Dokunmatik Optimizasyon</h4>
                <p>Mobil cihazlar için optimize edilmiş dokunma alanları</p>
              </div>

              <div className="mobile-feature">
                <div className="feature-icon-container">
                  <Eye className="feature-icon" />
                </div>
                <h4>Responsive Tasarım</h4>
                <p>Farklı ekran boyutlarına uyumlu tasarım</p>
              </div>
            </div>

            <div className="mobile-simulation">
              <h4>Mobil Simülasyon</h4>
              <div className="mobile-frame">
                <div className="mobile-header">
                  <div className="mobile-status-bar">
                    <span>9:41</span>
                    <div className="status-icons">
                      <span>📶</span>
                      <span>📶</span>
                      <span>🔋</span>
                    </div>
                  </div>
                </div>
                
                <div className="mobile-content">
                  <div className="mobile-nav-preview">
                    <div className="mobile-nav-item active">
                      <Home className="mobile-nav-icon" />
                      <span>Ana Sayfa</span>
                    </div>
                    <div className="mobile-nav-item">
                      <BookOpen className="mobile-nav-icon" />
                      <span>Akademik</span>
                    </div>
                    <div className="mobile-nav-item">
                      <Award className="mobile-nav-icon" />
                      <span>Aktiviteler</span>
                    </div>
                    <div className="mobile-nav-item">
                      <Bell className="mobile-nav-icon" />
                      <span>Bildirimler</span>
                    </div>
                    <div className="mobile-nav-item">
                      <User className="mobile-nav-icon" />
                      <span>Profil</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'analytics',
      title: 'Navigasyon Analitikleri',
      description: 'Navigasyon kullanım analitikleri ve istatistikler',
      icon: BarChart3,
      component: (
        <div className="demo-analytics">
          <div className="analytics-demo">
            <h3>Navigasyon Analitikleri</h3>
            
            <div className="analytics-grid">
              <div className="analytics-card">
                <div className="analytics-header">
                  <BarChart3 className="analytics-icon" />
                  <h4>Sayfa Görüntülemeleri</h4>
                </div>
                <div className="analytics-content">
                  <div className="analytics-number">1,247</div>
                  <div className="analytics-trend positive">
                    <TrendingUp className="trend-icon" />
                    <span>+12.5%</span>
                  </div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-header">
                  <Clock className="analytics-icon" />
                  <h4>Ortalama Oturum Süresi</h4>
                </div>
                <div className="analytics-content">
                  <div className="analytics-number">24:32</div>
                  <div className="analytics-trend positive">
                    <TrendingUp className="trend-icon" />
                    <span>+8.3%</span>
                  </div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-header">
                  <Users className="analytics-icon" />
                  <h4>Aktif Kullanıcılar</h4>
                </div>
                <div className="analytics-content">
                  <div className="analytics-number">156</div>
                  <div className="analytics-trend positive">
                    <TrendingUp className="trend-icon" />
                    <span>+5.7%</span>
                  </div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-header">
                  <Target className="analytics-icon" />
                  <h4>Hedef Tamamlama</h4>
                </div>
                <div className="analytics-content">
                  <div className="analytics-number">87%</div>
                  <div className="analytics-trend positive">
                    <TrendingUp className="trend-icon" />
                    <span>+3.2%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="analytics-charts">
              <div className="chart-section">
                <h4>En Popüler Sayfalar</h4>
                <div className="popular-pages">
                  <div className="page-item">
                    <span className="page-name">Ana Sayfa</span>
                    <div className="page-bar">
                      <div className="page-progress" style={{ width: '85%' }}></div>
                    </div>
                    <span className="page-count">1,247</span>
                  </div>
                  <div className="page-item">
                    <span className="page-name">Ödevler</span>
                    <div className="page-bar">
                      <div className="page-progress" style={{ width: '72%' }}></div>
                    </div>
                    <span className="page-count">892</span>
                  </div>
                  <div className="page-item">
                    <span className="page-name">Kulüpler</span>
                    <div className="page-bar">
                      <div className="page-progress" style={{ width: '58%' }}></div>
                    </div>
                    <span className="page-count">654</span>
                  </div>
                  <div className="page-item">
                    <span className="page-name">Duyurular</span>
                    <div className="page-bar">
                      <div className="page-progress" style={{ width: '45%' }}></div>
                    </div>
                    <span className="page-count">432</span>
                  </div>
                </div>
              </div>

              <div className="chart-section">
                <h4>Kullanıcı Yolculuğu</h4>
                <div className="user-journey">
                  <div className="journey-step">
                    <div className="step-icon">🏠</div>
                    <span>Ana Sayfa</span>
                    <div className="step-arrow">→</div>
                  </div>
                  <div className="journey-step">
                    <div className="step-icon">📚</div>
                    <span>Ödevler</span>
                    <div className="step-arrow">→</div>
                  </div>
                  <div className="journey-step">
                    <div className="step-icon">🏆</div>
                    <span>Kulüpler</span>
                    <div className="step-arrow">→</div>
                  </div>
                  <div className="journey-step">
                    <div className="step-icon">📢</div>
                    <span>Duyurular</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentSection = demoSections.find(section => section.id === activeSection);

  return (
    <NavigationProvider>
      <div className="navigation-demo-page">
        {/* Enhanced Top Navigation */}
        <EnhancedTopNavigation />
        
        {/* Enhanced Sidebar */}
        <EnhancedSidebar />
        
        {/* Mobile Navigation */}
        <MobileNavigation />
        
        {/* Navigation Analytics */}
        <NavigationAnalytics />

        {/* Main Content */}
        <main className="demo-main-content">
          <div className="demo-container">
            {/* Demo Header */}
            <motion.div 
              className="demo-header"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="header-content">
                <div className="header-left">
                  <h1>Navigasyon Geliştirmeleri Demo</h1>
                  <p>TOFAS FEN WebApp için geliştirilmiş navigasyon sisteminin özellikleri ve kullanım örnekleri</p>
                </div>
                <div className="header-right">
                  <div className="demo-stats">
                    <div className="stat-item">
                      <span className="stat-number">6</span>
                      <span className="stat-label">Bileşen</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">15+</span>
                      <span className="stat-label">Özellik</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">100%</span>
                      <span className="stat-label">Responsive</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Demo Navigation */}
            <motion.nav 
              className="demo-navigation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {demoSections.map((section) => (
                <button
                  key={section.id}
                  className={`demo-nav-btn ${activeSection === section.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <section.icon className="nav-btn-icon" />
                  <span className="nav-btn-text">{section.title}</span>
                </button>
              ))}
            </motion.nav>

            {/* Demo Content */}
            <motion.div 
              className="demo-content"
              key={activeSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              {currentSection?.component}
            </motion.div>

            {/* Demo Footer */}
            <motion.footer 
              className="demo-footer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="footer-content">
                <div className="footer-left">
                  <p>&copy; 2024 TOFAS FEN Lisesi. Tüm hakları saklıdır.</p>
                </div>
                <div className="footer-right">
                  <div className="footer-links">
                    <a href="#" className="footer-link">Dokümantasyon</a>
                    <a href="#" className="footer-link">API Referansı</a>
                    <a href="#" className="footer-link">Destek</a>
                  </div>
                </div>
              </div>
            </motion.footer>
          </div>
        </main>
      </div>
    </NavigationProvider>
  );
};

// Import missing icons
import { Smartphone, Fingerprint } from 'lucide-react';
import { Link } from 'react-router-dom';

export default NavigationDemoPage;
