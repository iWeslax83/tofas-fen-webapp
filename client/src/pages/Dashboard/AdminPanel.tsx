import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ChevronRight
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
// import NotificationBell from '../../components/NotificationBell'; // Not used
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { dashboardButtons } from './dashboardButtonConfig';
import React from 'react';
import './AdminPanel.css';

// Filter for admin role, but admin sees all
const pageButtons = dashboardButtons.filter(btn => btn.roles.includes('admin'));

const AdminPanel: React.FC = () => {
  const { user } = useAuthContext();
  
  // Role-based access control
  if (!user) {
    return (
      <div className="centered-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  // Check if user has admin role
  if (user.rol !== 'admin') {
    console.warn(`User role ${user.rol} not allowed for admin panel`);
    window.location.href = `/${user.rol || 'login'}`;
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
              <Link to={button.route} className="action-card">
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