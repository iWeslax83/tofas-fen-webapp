import React from 'react';
import DashboardPanel from '../../components/DashboardPanel';
import { useAuthContext } from '../../contexts/AuthContext';

const StudentPanel: React.FC = () => {
  const { user } = useAuthContext();

  return (
    <DashboardPanel
      pageTitle="Öğrenci Paneli"
      role="student"
      shouldShowDormitoryOnly={true}
      customWelcomeContent="Öğrenci paneline hoş geldiniz. Tüm eğitim araçlarına buradan erişebilirsiniz."
      additionalUserData={{
        sinif: user?.sinif,
        sube: user?.sube,
        pansiyon: user?.pansiyon,
        oda: user?.oda,
      }}
    />
  );
};

export default StudentPanel;