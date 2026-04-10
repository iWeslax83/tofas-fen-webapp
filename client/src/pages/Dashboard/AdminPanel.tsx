import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardPanel from '../../components/DashboardPanel';
import { useAuthContext } from '../../contexts/AuthContext';
import './AdminPanel.css';

const AdminPanel: React.FC = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user && user.rol !== 'admin') {
      if (import.meta.env.DEV)
        console.warn(
          `[AdminPanel] User role ${user.rol || 'undefined'} not allowed for admin panel`,
        );
      navigate(`/${user.rol || 'login'}`);
    }
  }, [user, navigate]);

  return (
    <DashboardPanel
      pageTitle="Admin Paneli"
      role="admin"
      shouldValidateRole={true}
      customWelcomeContent="Admin paneline hoş geldiniz. Tüm sistem yönetimi araçlarına buradan erişebilirsiniz."
    />
  );
};

export default AdminPanel;
