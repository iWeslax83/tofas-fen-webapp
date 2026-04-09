import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles: string[];
}

/**
 * Client-side route guard. Checks the user's role against `allowedRoles`
 * and redirects unauthorized users to their own dashboard or /login.
 *
 * F-C1: we MUST wait for `initialized` (set in authStore.checkAuth's finally
 * block) before making any redirect decision. Without this, the first render
 * after a hard reload sees `user: null` and `isLoading: false` at the same
 * time, so the guard redirects to /login for a split second even when the
 * user's session cookie is perfectly valid — that's the "flash of login"
 * the report flagged as a CRITICAL UX and security issue.
 *
 * NOTE: client-side guarding is UX only. The API layer MUST enforce the
 * same role checks; see B-C2 in the code review report.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const initialized = useAuthStore((s) => s.initialized);

  if (!initialized || isLoading) {
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
    // Redirect unauthorized user to their own dashboard
    return <Navigate to={`/${userRole}`} replace />;
  }

  return children;
};

export default ProtectedRoute;
