import React from 'react';
import DashboardPanel from '../../components/DashboardPanel';
import { useAuthContext } from '../../contexts/AuthContext';

const TeacherPanel: React.FC = () => {
  useAuthContext();

  return (
    <DashboardPanel
      pageTitle="Öğretmen Paneli"
      role="teacher"
      customWelcomeContent="Öğretmen paneline hoş geldiniz. Tüm eğitim araçlarına buradan erişebilirsiniz."
    />
  );
};

export default TeacherPanel;