import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import ModernDashboardLayout from './ModernDashboardLayout';
import { useAuthContext } from '../contexts/AuthContext';
import { dashboardButtons } from '../pages/Dashboard/dashboardButtonConfig';

interface PageButton {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  path: string;
}

interface DashboardPanelProps {
  pageTitle: string;
  role: 'student' | 'teacher' | 'parent' | 'admin' | 'hizmetli';
  shouldValidateRole?: boolean;
  shouldShowDormitoryOnly?: boolean;
  onAdditionalDataLoad?: (user?: Record<string, unknown>) => Promise<void>;
  customWelcomeContent?: React.ReactNode;
  additionalUserData?: Record<string, unknown>;
}

const DashboardPanel: React.FC<DashboardPanelProps> = ({
  pageTitle,
  role,
  shouldValidateRole = false,
  shouldShowDormitoryOnly = false,
  onAdditionalDataLoad,
  customWelcomeContent,
  additionalUserData = {},
}) => {
  const { user, isLoading: authLoading } = useAuthContext();
  const [pageButtons, setPageButtons] = useState<PageButton[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Validate role access if needed
  useEffect(() => {
    if (!authLoading && user && shouldValidateRole && user.rol !== role) {
      // Navigation would be handled by parent component
      console.warn(`[DashboardPanel] User role ${user.rol} not allowed for ${role} panel`);
    }
  }, [authLoading, user, shouldValidateRole, role]);

  // Load data and buttons
  useEffect(() => {
    const loadData = async () => {
      if (!authLoading && user) {
        try {
          // Call additional data loader if provided
          if (onAdditionalDataLoad) {
            await onAdditionalDataLoad(user as unknown as Record<string, unknown>);
          }

          // Filter buttons for the role
          const buttons = dashboardButtons
            .filter(btn => {
              if (!btn.roles.includes(role)) return false;

              // Check dormitory-specific buttons
              if (shouldShowDormitoryOnly && btn.showForDormitory) {
                return user.pansiyon === true;
              }

              return true;
            })
            .map(btn => ({
              id: btn.key,
              title: btn.title,
              description: btn.description,
              icon: btn.icon,
              color: 'tofas-700',
              path: btn.route,
            }));

          setPageButtons(buttons as PageButton[]);
          setIsLoading(false);
        } catch (error) {
          console.error(`[DashboardPanel] Error loading ${role} panel data:`, error);
          setIsLoading(false);
        }
      }
    };

    loadData();
  }, [authLoading, user, role, shouldShowDormitoryOnly, onAdditionalDataLoad]);

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
    { label: pageTitle },
  ];

  return (
    <ModernDashboardLayout pageTitle={pageTitle} breadcrumb={breadcrumb}>
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
              <p>{customWelcomeContent || `${role.charAt(0).toUpperCase() + role.slice(1)} paneline hoş geldiniz.`}</p>
              {!!additionalUserData.sinif && (
                <p className="class-info">
                  <strong>Sınıf:</strong> {additionalUserData.sinif as React.ReactNode}
                  {!!additionalUserData.sube && ` - ${additionalUserData.sube as React.ReactNode}`}
                </p>
              )}
              {!!additionalUserData.pansiyon && (
                <p className="dormitory-info">
                  <strong>Pansiyon:</strong> {(additionalUserData.oda as React.ReactNode) || 'Atanmış'}
                </p>
              )}
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
              <Link to={button.path} className="action-card" data-color={button.color}>
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

export default DashboardPanel;
