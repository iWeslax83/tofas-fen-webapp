import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  GraduationCap
} from 'lucide-react';
import { useUser, useIsLoading } from '../stores/authStore';
import { SecureAPI } from '../utils/api';
import { dashboardButtons } from '../pages/Dashboard/dashboardButtonConfig';
import { UserRole } from '../@types';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { safeConsoleError } from '../utils/safeLogger';
import ModernDashboardLayout from './ModernDashboardLayout';
import './ModernDashboard.css';

interface UserData {
  id: string;
  adSoyad: string;
  email: string;
  rol: string;
  sinif?: string | undefined;
  sube?: string | undefined;
  pansiyon?: boolean | undefined;
  oda?: string | undefined;
  avatar?: string | undefined;
  sonGiris?: string | undefined;
}

interface DashboardStats {
  totalStudents?: number;
  totalTeachers?: number;
  totalParents?: number;
  activeClubs?: number;
  upcomingEvents?: number;
  recentActivities?: number;
}

const ModernDashboard: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [, setStats] = useState<DashboardStats>({});
  const lastFetchTime = useRef<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const authUser = useUser();
  const authLoading = useIsLoading();
  const navigate = useNavigate();
  const { handleApiError } = useErrorHandler();

  // Fetch user data and stats
  const fetchUserData = useCallback(async () => {
    try {
      // Use authUser data directly instead of API call
      if (authUser) {
        const finalUserData: UserData = {
          id: authUser.id,
          adSoyad: authUser.adSoyad,
          email: authUser.email || '',
          rol: authUser.rol,
          sinif: authUser.sinif ? String(authUser.sinif) : undefined,
          sube: authUser.sube ? String(authUser.sube) : undefined,
          pansiyon: authUser.pansiyon ?? undefined,
          oda: authUser.oda ? String(authUser.oda) : undefined,
          avatar: undefined, // Not in User type
          sonGiris: undefined // Not in User type
        };
        setUserData(finalUserData);
      }
    } catch (error) {
      safeConsoleError('Error setting user data:', error);
      // Fallback to authUser data
      if (authUser) {
        setUserData({
          id: authUser.id,
          adSoyad: authUser.adSoyad,
          email: authUser.email || '',
          rol: authUser.rol || 'student',
          sinif: authUser.sinif ? String(authUser.sinif) : undefined,
          sube: authUser.sube ? String(authUser.sube) : undefined,
          pansiyon: authUser.pansiyon ?? undefined,
          oda: authUser.oda ? String(authUser.oda) : undefined,
          avatar: undefined,
          sonGiris: undefined
        });
      }
    }
  }, [authUser]);

  // Fetch dashboard stats with rate limiting
  const fetchStats = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current;

    // Rate limit: don't fetch more than once every 5 seconds
    if (timeSinceLastFetch < 5000) {
      return;
    }

    lastFetchTime.current = now;

    try {
      const response = await SecureAPI.get('/api/dashboard/stats');
      setStats((response as { data: { data: DashboardStats } }).data.data);
    } catch (error) {
      safeConsoleError('Error fetching stats:', error);
      handleApiError(error, 'İstatistikler alınırken hata oluştu');
      // Set default stats
      setStats({
        totalStudents: 1250,
        totalTeachers: 85,
        totalParents: 2400,
        activeClubs: 12,
        upcomingEvents: 8,
        recentActivities: 15
      });
    }
  }, [authUser, handleApiError]); // Removed handleError dependency to prevent infinite loop - Re-added as it's needed for memoization consistency

  // Get role-specific buttons
  const getRoleButtons = () => {
    const currentRole = userData?.rol || authUser?.rol;

    return dashboardButtons.filter(btn => {
      const hasRole = btn.roles.includes(currentRole as UserRole);
      const dormitoryCheck = !btn.showForDormitory || userData?.pansiyon;

      return hasRole && dormitoryCheck;
    });
  };

  // Professional color theme functions
  const getCardGradient = (_color: string) => {
    const gradients = {
      emerald: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      sky: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      violet: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
      amber: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
      indigo: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
      cyan: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)',
      rose: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
      green: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      blue: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
      purple: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
      orange: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
      teal: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
      default: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)'
    };
    return gradients[_color as keyof typeof gradients] || gradients.default;
  };

  const getCardBorderColor = (_color: string) => {
    const borders = {
      emerald: '#bbf7d0',
      sky: '#bae6fd',
      violet: '#e9d5ff',
      amber: '#fed7aa',
      indigo: '#c7d2fe',
      cyan: '#a5f3fc',
      rose: '#fecdd3',
      green: '#bbf7d0',
      blue: '#bfdbfe',
      purple: '#e9d5ff',
      orange: '#fed7aa',
      teal: '#99f6e4',
      default: '#e5e7eb'
    };
    return borders[_color as keyof typeof borders] || borders.default;
  };

  const getCardShadowColor = () => {
    return 'rgba(0, 0, 0, 0.08)';
  };

  const getHoverBorderColor = (_color: string) => {
    const borders = {
      emerald: '#10b981',
      sky: '#0ea5e9',
      violet: '#8b5cf6',
      amber: '#f59e0b',
      indigo: '#6366f1',
      cyan: '#06b6d4',
      rose: '#f43f5e',
      green: '#22c55e',
      blue: '#3b82f6',
      purple: '#a855f7',
      orange: '#f97316',
      teal: '#14b8a6',
      default: '#6b7280'
    };
    return borders[_color as keyof typeof borders] || borders.default;
  };

  const getIconBackground = (_color: string) => {
    const backgrounds = {
      emerald: '#10b981',
      sky: '#0ea5e9',
      violet: '#8b5cf6',
      amber: '#f59e0b',
      indigo: '#6366f1',
      cyan: '#06b6d4',
      rose: '#f43f5e',
      green: '#22c55e',
      blue: '#3b82f6',
      purple: '#a855f7',
      orange: '#f97316',
      teal: '#14b8a6',
      default: '#6b7280'
    };
    return backgrounds[_color as keyof typeof backgrounds] || backgrounds.default;
  };

  const getIconColor = () => {
    return '#ffffff';
  };

  const getTextColor = () => {
    return '#1f2937';
  };

  const getSubtextColor = () => {
    return '#6b7280';
  };

  useEffect(() => {
    if (authLoading) return;

    if (!authUser) {
      navigate('/login');
      return;
    }

    const initialize = async () => {
      await fetchUserData();
      await fetchStats();
      setIsLoading(false);
    };

    initialize();
  }, [authUser, authLoading, navigate, fetchUserData, fetchStats]);

  if (isLoading || authLoading) {
    return (
      <div className="modern-dashboard-loading">
        <div className="loading-container">
          <div className="loading-logo">
            <GraduationCap className="loading-icon" />
          </div>
          <div className="loading-text">Tofaş Fen Lisesi</div>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (!userData || !authUser) {
    return null;
  }

  const roleButtons = getRoleButtons();

  return (
    <ModernDashboardLayout pageTitle="Panel">
      {/* Welcome Section */}
      <section className="welcome-section">
        <div className="welcome-card">
          <div className="welcome-content">
            <div className="welcome-text">
              <h1>Hoş Geldiniz, {userData.adSoyad}</h1>
              <p className="welcome-subtitle">
                {userData.rol === 'student'
                  ? `${userData.sinif && userData.sube ? `${userData.sinif}/${userData.sube} sınıfı öğrencisi` : 'Öğrenci'}`
                  : `${userData.rol === 'admin' ? 'Yönetici' :
                    userData.rol === 'teacher' ? 'Öğretmen' :
                      userData.rol === 'parent' ? 'Veli' :
                        userData.rol === 'hizmetli' ? 'Hizmetli' : 'Kullanıcı'} paneli`
                }
                {userData.pansiyon && userData.oda && ` - Oda: ${userData.oda}`}
              </p>
              <div className="welcome-badges">
                <span className="badge role-badge">
                  {userData.rol === 'admin' ? 'Yönetici' :
                    userData.rol === 'teacher' ? 'Öğretmen' :
                      userData.rol === 'student' ? 'Öğrenci' :
                        userData.rol === 'parent' ? 'Veli' :
                          userData.rol === 'hizmetli' ? 'Hizmetli' : 'Kullanıcı'}
                </span>
                {userData.rol === 'student' && userData.sinif && userData.sube && (
                  <span className="badge class-badge">
                    <GraduationCap className="badge-icon" />
                    {userData.sinif}/{userData.sube}
                  </span>
                )}
                {userData.rol === 'student' && (
                  <span className="badge class-badge">
                    <Users className="badge-icon" />
                    {userData.pansiyon === true ? 'Yatılı' : 'Gündüzlü'}
                  </span>
                )}
              </div>
            </div>
            <div className="welcome-illustration">
              <div className="illustration-container">
                <GraduationCap className="illustration-icon" />
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Dashboard Grid */}
      <section className="dashboard-grid-section">
        <div className="section-header">
          <h2>Hızlı İşlemler</h2>
          <p>En sık kullandığınız özelliklere hızlı erişim</p>
        </div>

        <div className="dashboard-grid">
          {roleButtons.map((button) => (
            <div
              key={button.key}
              className="dashboard-card-container"
            >
              <Link to={button.route} className="dashboard-card-link">
                <div
                  className={`dashboard-card ${button.color || 'default'}`}
                  style={{
                    background: getCardGradient(button.color || 'default'),
                    border: `2px solid ${getCardBorderColor(button.color || 'default')}`,
                    boxShadow: `0 8px 32px ${getCardShadowColor()}`,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    const target = e.currentTarget;
                    target.style.transform = 'translateY(-4px)';
                    target.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.12)';
                    target.style.borderTop = `4px solid ${getHoverBorderColor(button.color || 'default')}`;
                  }}
                  onMouseLeave={(e) => {
                    const target = e.currentTarget;
                    target.style.transform = 'translateY(0)';
                    target.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.08)';
                    target.style.borderTop = `2px solid ${getCardBorderColor(button.color || 'default')}`;
                  }}
                >
                  <div className="card-header">
                    <div
                      className="card-icon"
                      style={{
                        background: getIconBackground(button.color || 'default'),
                        color: getIconColor(),
                      }}
                    >
                      {button.icon && <button.icon className="icon" />}
                    </div>
                  </div>
                  <div className="card-content">
                    <h3 style={{ color: getTextColor() }}>
                      {button.title}
                    </h3>
                    <p style={{ color: getSubtextColor() }}>
                      {button.description}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

      </section>
    </ModernDashboardLayout>
  );
};

export default ModernDashboard;
