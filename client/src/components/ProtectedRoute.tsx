import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles: string[];
}

/**
 * Client-side route guard: Kullanıcının rolünü kontrol eder.
 * İzin verilen roller arasında değilse, kullanıcıyı kendi dashboard'una veya login'e yönlendirir.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user.rol || '';

  if (!allowedRoles.includes(userRole)) {
    // Yetkisiz kullanıcıyı kendi dashboard'una yönlendir
    return <Navigate to={`/${userRole}`} replace />;
  }

  return children;
};

export default ProtectedRoute;
