import React from 'react';
import DashboardPanel from '../../components/DashboardPanel';
import { useAuthContext } from '../../contexts/AuthContext';
import { UserService } from '../../utils/apiService';

const ParentPanel: React.FC = () => {
  useAuthContext();

  const handleAdditionalDataLoad = async (currentUser: any) => {
    try {
      // Try to fetch children data, but don't fail if it doesn't work
      try {
        const childrenResponse = await UserService.getChildren(currentUser.id);
        console.log('[ParentPanel] Children data loaded:', childrenResponse.data);
      } catch (childrenError) {
        console.warn('[ParentPanel] Could not fetch children data:', childrenError);
      }
    } catch (error) {
      console.error('[ParentPanel] Error loading additional data:', error);
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