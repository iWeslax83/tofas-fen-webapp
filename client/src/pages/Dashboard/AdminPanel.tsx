import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  ChevronRight
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
// import NotificationBell from '../../components/NotificationBell'; // Not used
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { dashboardButtons } from './dashboardButtonConfig';
import React from 'react';
import './AdminPanel.css';

const AdminPanel: React.FC = () => {
  const { user, isLoading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const [pageButtons, setPageButtons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!authLoading && user) {
      console.log('[AdminPanel] Setting up admin panel with user:', user);
      
      // Check if user has admin role
      if (user.rol !== 'admin') {
        console.warn(`[AdminPanel] User role ${user.rol || 'undefined'} not allowed for admin panel`);
        navigate(`/${user.rol || 'login'}`);
        return;
      }

      // Filter buttons for admin role
      const buttons = dashboardButtons
        .filter(btn => {
          const hasRole = btn.roles.includes('admin');
          console.log(`[AdminPanel] Button ${btn.key}: hasRole=${hasRole}`);
          return hasRole;
        })
        .map(btn => ({
          key: btn.key,
          title: btn.title,
          description: btn.description,
          icon: btn.icon,
          color: btn.color || 'blue',
          route: btn.route
        }));
      
      console.log('[AdminPanel] Admin buttons:', buttons);
      setPageButtons(buttons);
      setIsLoading(false);
    }
  }, [authLoading, user, navigate]);

  // Role-based access control
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

  // Check if user has admin role
  if (user.rol !== 'admin') {
    console.warn(`[AdminPanel] User role ${user.rol || 'undefined'} not allowed for admin panel`);
    navigate(`/${user.rol || 'login'}`);
    return null;
  }

  const breadcrumb = [
    { label: 'Ana Sayfa', path: '/' },
    { label: 'Admin Paneli' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Admin Paneli"
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
              <p>Admin paneline hoş geldiniz. Tüm sistem yönetimi araçlarına buradan erişebilirsiniz.</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="quick-actions">
        <h3>Hızlı İşlemler</h3>
        <div className="action-grid">
          {pageButtons.map((button, index) => (
            <motion.div
              key={button.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Link to={button.route} className="action-card" data-color={button.color || 'blue'}>
                <div className="action-icon">
                  {button.icon && <button.icon size={24} />}
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

export default AdminPanel;