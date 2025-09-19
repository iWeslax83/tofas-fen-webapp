// src/pages/NotFoundPage.tsx/*
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Home } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { UserRole } from '../../@types';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const getBackRoute = () => {
    const role = user?.rol;
    switch (role as UserRole) {
      case 'admin': return '/admin';
      case 'student': return '/student';
      case 'teacher': return '/teacher';
      case 'parent': return '/parent';
      case 'hizmetli': return '/hizmetli';
      default: return '/';
    }
  };

  const breadcrumb = [
    { label: 'Ana Sayfa', path: getBackRoute() },
    { label: 'Sayfa Bulunamadı' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Sayfa Bulunamadı"
      breadcrumb={breadcrumb}
    >
      <div className="not-found-page">
        <main className="main-content">
        <div className="content-card error-card">
          <div className="error-content">
            <AlertTriangle size={64} className="error-icon" />
            <h2>404 - Sayfa Bulunamadı</h2>
            <p className="error-message">
              Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir.
            </p>
            <div className="button-group">
              <button 
                onClick={() => {
                  // Navigate to user's role-based main page
                  const role = user?.rol;
                  switch (role as UserRole) {
                    case 'admin': navigate('/admin'); break;
                    case 'student': navigate('/student'); break;
                    case 'teacher': navigate('/teacher'); break;
                    case 'parent': navigate('/parent'); break;
                    case 'hizmetli': navigate('/hizmetli'); break;
                    default: navigate('/'); break;
                  }
                }}
                className="button button--secondary"
              >
                <ArrowLeft size={18} className="button-icon" />
                Ana Sayfaya Dön
              </button>
              <button 
                onClick={() => navigate('/')}
                className="button button--primary"
              >
                <Home size={18} className="button-icon" />
                Anasayfaya Dön
              </button>
            </div>
          </div>
        </div>
        </main>
      </div>
    </ModernDashboardLayout>
  );
}