import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  GraduationCap, 
  ChevronRight, 
  Home, 
  UserCheck, 
  Settings, 
  LogOut,
  Star,
  TrendingUp
} from 'lucide-react';
import NotificationBell from '../../components/NotificationBell';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { useAuthContext } from '../../contexts/AuthContext';
import { SecureAPI } from '../../utils/api';
import { dashboardButtons } from './dashboardButtonConfig';
import './StudentPanel.css';

interface UserData {
  id: string;
  adSoyad: string;
  email: string;
  rol: string;
  sinif?: string;
  sube?: string;
  pansiyon?: boolean;
  oda?: string;
}

interface PageButton {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  path: string;
}

const StudentPanel: React.FC = () => {
  const { user, logout, isLoading: authLoading } = useAuthContext();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [studentButtons, setStudentButtons] = useState<PageButton[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!authLoading && user) {
        try {
          const response = await SecureAPI.get('/api/auth/me') as { data: UserData };
          const userInfo = response.data;
          setUserData(userInfo);
          
          // Filter buttons for student role
          const buttons = dashboardButtons
            .filter(btn => {
              if (!btn.roles.includes('student')) return false;
              
              // Check if button is dormitory-specific
              if (btn.showForDormitory) {
                return userInfo.pansiyon === true;
              }
              
              return true;
            })
            .map(btn => ({
              id: btn.key,
              title: btn.title,
              description: btn.description,
              icon: btn.icon,
              color: btn.color || 'blue',
              path: btn.route
            }));
          
          setStudentButtons(buttons as PageButton[]);
          setIsLoading(false);
        } catch (error) {
          console.error('Error fetching user data:', error);
          setIsLoading(false);
        }
      }
    };

    fetchUserData();
  }, [authLoading, user]);

  if (isLoading || authLoading) {
    return (
      <div className="centered-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user || !userData) {
    return null;
  }

  const breadcrumb = [
    { label: 'Ana Sayfa', path: '/' },
    { label: 'Öğrenci Paneli' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Öğrenci Paneli"
      breadcrumb={breadcrumb}
    >
      <div className="welcome-section">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="welcome-card"
        >
          <div className="welcome-content">
            <div className="welcome-text">
              <h2>Hoş Geldiniz, {userData.adSoyad}!</h2>
              <p>Öğrenci paneline hoş geldiniz. Tüm eğitim araçlarına buradan erişebilirsiniz.</p>
              {userData.sinif && (
                <p className="class-info">
                  <strong>Sınıf:</strong> {userData.sinif}
                  {userData.sube && ` - ${userData.sube}`}
                </p>
              )}
              {userData.pansiyon && (
                <p className="dormitory-info">
                  <strong>Pansiyon:</strong> {userData.oda || 'Atanmış'}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="quick-actions">
        <h3>Hızlı İşlemler</h3>
        <div className="action-grid">
          {studentButtons.map((button, index) => (
            <motion.div
              key={button.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Link to={button.path} className="action-card">
                <div className="action-icon">
                  <button.icon className="w-6 h-6" />
                </div>
                <div className="action-content">
                  <h4>{button.title}</h4>
                  <p>{button.description}</p>
                </div>
                <ChevronRight className="action-arrow" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </ModernDashboardLayout>
  );
};

export default StudentPanel;