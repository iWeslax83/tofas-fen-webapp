import React from 'react';
import DashboardPanel from '../../components/DashboardPanel';
import { useAuthContext } from '../../contexts/AuthContext';
import { UserService } from '../../utils/apiService';
import './ParentPanel.css';

const ParentPanel: React.FC = () => {
  useAuthContext();

  const handleAdditionalDataLoad = async (currentUser: any) => {
    try {
      await UserService.getChildren(currentUser.id);
    } catch {
      // Children data fetch is non-critical, silently ignore
    }
  };

  return (
    <DashboardPanel
      pageTitle="Veli Paneli"
      role="parent"
      customWelcomeContent="Veli paneline hoş geldiniz. Çocuğunuzun eğitim sürecini buradan takip edebilirsiniz."
      onAdditionalDataLoad={handleAdditionalDataLoad}
    />
  );
};

export default ParentPanel;