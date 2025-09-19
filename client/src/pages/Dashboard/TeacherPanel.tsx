import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { UserService } from '../../utils/apiService';
import NotificationBell from '../../components/NotificationBell';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { dashboardButtons } from './dashboardButtonConfig';
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

interface PageButton {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  path: string;
}

// Filter buttons for teacher role
const getTeacherButtons = (): PageButton[] => {
  return dashboardButtons
    .filter(btn => btn.roles.includes('teacher'))
    .map(btn => ({
      id: btn.key,
      title: btn.title,
      description: btn.description,
      icon: btn.icon,
      color: btn.color || 'blue',
      path: btn.route
    })) as PageButton[];
};

const TeacherPanel: React.FC = () => {
  const { user, logout, isLoading: authLoading } = useAuthContext();
  const [pageButtons, setPageButtons] = useState<PageButton[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      console.log('Setting up teacher panel with user:', user);
      
      console.log('Getting teacher buttons...');
      const buttons = getTeacherButtons();
      console.log('Teacher buttons:', buttons);
      setPageButtons(buttons);
      
      setIsLoading(false);
    }
  }, [authLoading, user]);

  if (isLoading || authLoading) {
    return (
      <div className="centered-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const breadcrumb = [
    { label: 'Ana Sayfa', path: '/' },
    { label: 'Öğretmen Paneli' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Öğretmen Paneli"
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
              <h2>Hoş Geldiniz, {user.adSoyad}!</h2>
              <p>Öğretmen paneline hoş geldiniz. Tüm eğitim araçlarına buradan erişebilirsiniz.</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="quick-actions">
        <h3>Hızlı İşlemler</h3>
        <div className="action-grid">
          {pageButtons.map((button, index) => (
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

export default TeacherPanel;