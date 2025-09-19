import { useEffect, useState } from "react";
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom'; // useNavigate removed
import { 
  // UserCog, // Not used
  // BookOpen, // Not used
  // ClipboardList, // Not used 
  ChevronRight
} from 'lucide-react';
import { useAuthContext } from "../../contexts/AuthContext";
import { dashboardButtons } from "./dashboardButtonConfig";
// import NotificationBell from "../../components/NotificationBell"; // Not used
import ModernDashboardLayout from "../../components/ModernDashboardLayout";
import React from 'react';

// interface UserData { // Not used
//   adSoyad: string;
//   email: string;
//   role?: string;
// }

interface PageButton {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  path: string;
}

const HizmetliPanel: React.FC = () => {
  const { user, isLoading: authLoading } = useAuthContext(); // logout removed
  const [pageButtons, setPageButtons] = useState<PageButton[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      // Filter buttons for hizmetli role
      const buttons = dashboardButtons
        .filter(btn => btn.roles.includes('hizmetli'))
        .map(btn => ({
          id: btn.key,
          title: btn.title,
          description: btn.description,
          icon: btn.icon,
          color: btn.color || 'blue',
          path: btn.route
        }));
      
      setPageButtons(buttons as PageButton[]);
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
    { label: 'Hizmetli Paneli' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Hizmetli Paneli"
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
              <p>Hizmetli paneline hoş geldiniz. Okul yönetimi araçlarına buradan erişebilirsiniz.</p>
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

export default HizmetliPanel;