import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAuthContext } from '../../contexts/AuthContext';
import { UserService } from '../../utils/apiService';
import { SecureAPI } from '../../utils/api';
import NotificationBell from '../../components/NotificationBell';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { dashboardButtons } from './dashboardButtonConfig';
import { 
  User, 
  ChevronRight, 
  GraduationCap, 
  Home, 
  UserCheck, 
  Settings, 
  LogOut,
  Star,
  TrendingUp
} from 'lucide-react';

// Types
interface ChildInfo {
  id: string;
  adSoyad: string;
  sinif: string;
  ogrenciNo: string;
  oda?: string;
  pansiyon?: boolean;
  [key: string]: any; // For additional dynamic properties
}

interface PageButton {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  path: string;
}

const ParentPanel: React.FC = () => {
  const { user, logout, isLoading: authLoading } = useAuthContext();
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [parentButtons, setParentButtons] = useState<PageButton[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!authLoading && user) {
        try {
          // Fetch children data
          const childrenResponse = await UserService.getChildren(user.id);
          setChildren((childrenResponse.data as ChildInfo[]) || []);

          // Filter buttons for parent role
          const buttons = dashboardButtons
            .filter(btn => btn.roles.includes('parent'))
            .map(btn => ({
              id: btn.key,
              title: btn.title,
              description: btn.description,
              icon: btn.icon,
              color: btn.color || 'blue',
              path: btn.route
            }));
          
          setParentButtons(buttons as PageButton[]);
          setIsLoading(false);
        } catch (error) {
          console.error('Error fetching parent data:', error);
          setIsLoading(false);
        }
      }
    };

    fetchData();
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
    { label: 'Veli Paneli' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Veli Paneli"
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
              <p>Veli paneline hoş geldiniz. Çocuğunuzun eğitim durumunu takip edebilirsiniz.</p>
              {children.length > 0 && (
                <div className="children-info">
                  <h4>Çocuklarınız:</h4>
                  {children.map((child, index) => (
                    <div key={child.id} className="child-item">
                      <User className="child-icon" />
                      <div className="child-details">
                        <span className="child-name">{child.adSoyad}</span>
                        <span className="child-class">{child.sinif}</span>
                        {child.pansiyon && (
                          <span className="child-dormitory">Pansiyon - Oda: {child.oda || 'Atanmış'}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="quick-actions">
        <h3>Hızlı İşlemler</h3>
        <div className="action-grid">
          {parentButtons.map((button, index) => (
            <motion.div
              key={button.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Link to={button.path} className="action-card">
                <div className="action-icon">
                  <button.icon size={24} />
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

export default ParentPanel;