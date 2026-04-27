import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, GraduationCap, House } from 'lucide-react';
import { useUser, useIsLoading } from '../stores/authStore';
import { SecureAPI } from '../utils/api';
import { dashboardButtons } from '../pages/Dashboard/dashboardButtonConfig';
import { UserRole } from '../@types';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { safeConsoleError } from '../utils/safeLogger';
import ModernDashboardLayout from './ModernDashboardLayout';
import EmailVerificationBanner from './EmailVerificationBanner';
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

const ModernDashboard: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
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
          sonGiris: undefined, // Not in User type
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
          sonGiris: undefined,
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
      await SecureAPI.get('/api/dashboard/stats');
    } catch (error) {
      safeConsoleError('Error fetching stats:', error);
      handleApiError(error, 'İstatistikler alınırken hata oluştu');
    }
  }, [authUser, handleApiError]); // Removed handleError dependency to prevent infinite loop - Re-added as it's needed for memoization consistency

  // Get role-specific buttons
  const getRoleButtons = () => {
    const currentRole = userData?.rol || authUser?.rol;

    return dashboardButtons.filter((btn) => {
      const hasRole = btn.roles.includes(currentRole as UserRole);
      const dormitoryCheck = !btn.showForDormitory || userData?.pansiyon;

      return hasRole && dormitoryCheck;
    });
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
      <div className="modern-dashboard-home">
        {/* Welcome Section */}
        <section className="welcome-section">
          <div className="welcome-card">
            <div className="welcome-content">
              <div className="welcome-text">
                <h1>Hoş Geldiniz, {userData.adSoyad}</h1>
                <p className="welcome-subtitle">
                  {userData.rol === 'student'
                    ? `${userData.sinif && userData.sube ? `${userData.sinif}/${userData.sube} sınıfı öğrencisi` : 'Öğrenci'}`
                    : `${
                        userData.rol === 'admin'
                          ? 'Yönetici'
                          : userData.rol === 'teacher'
                            ? 'Öğretmen'
                            : userData.rol === 'parent'
                              ? 'Veli'
                              : userData.rol === 'ziyaretci'
                                ? 'Ziyaretci'
                                : 'Kullanıcı'
                      } paneli`}
                  {userData.pansiyon && userData.oda && ` - Oda: ${userData.oda}`}
                </p>
                <div className="welcome-badges">
                  <span className="badge role-badge">
                    <GraduationCap className="badge-icon" />

                    {userData.rol === 'admin'
                      ? 'YÖNETİCİ'
                      : userData.rol === 'teacher'
                        ? 'ÖĞRETMEN'
                        : userData.rol === 'student'
                          ? 'ÖĞRENCİ'
                          : userData.rol === 'parent'
                            ? 'VELİ'
                            : userData.rol === 'ziyaretci'
                              ? 'ZİYARETÇİ'
                              : 'KULLANICI'}
                  </span>
                  {userData.rol === 'student' && userData.sinif && userData.sube && (
                    <span className="badge role-badge">
                      <Users className="badge-icon" />
                      {userData.sinif}/{userData.sube}
                    </span>
                  )}
                  {userData.rol === 'student' && (
                    <span className="badge role-badge">
                      <House className="badge-icon" />
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
        {/* Email Verification Banner */}
        <EmailVerificationBanner />
        {/* Dashboard Grid */}
        <section className="dashboard-grid-section">
          <div className="dashboard-grid">
            {roleButtons.map((button) => (
              <div key={button.key} className="dashboard-card-container">
                <Link to={button.route} className="dashboard-card-link">
                  <div className="dashboard-card">
                    <div className="card-header">
                      <div className="card-icon">
                        {button.icon && <button.icon className="icon" />}
                      </div>
                    </div>
                    <div className="card-content">
                      <h3>{button.title}</h3>
                      <p>{button.description}</p>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ModernDashboardLayout>
  );
};

export default ModernDashboard;
