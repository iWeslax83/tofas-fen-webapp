import React from 'react';
import DashboardPanel from '../../components/DashboardPanel';

const HizmetliPanel: React.FC = () => {
  return (
    <DashboardPanel
      pageTitle="Hizmetli Paneli"
      role="hizmetli"
      customWelcomeContent="Hizmetli paneline hoş geldiniz. Okul yönetimi araçlarına buradan erişebilirsiniz."
    />
  );
};

export default HizmetliPanel;