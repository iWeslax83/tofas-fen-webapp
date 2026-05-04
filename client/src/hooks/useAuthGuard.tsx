import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { SecureAPI } from '../utils/api';
import { useAuthContext } from '../contexts/AuthContext';
import { safeConsoleError, safeConsoleWarn } from '../utils/safeLogger';

interface User {
  id: string;
  adSoyad: string;
  rol: string | null;
  email?: string;
  oda?: string;
  sinif?: string;
  sube?: string;
  pansiyon?: boolean;
  childId?: string | string[];
  // For additional dynamic properties
}

/**
 * Role-guard hook. Redirects to the user's dashboard (or /login) if the
 * current user's role is not in `allowedRoles`.
 *
 * F-M15: this hook used to be exported as `useAuth`, which collided with
 * the Zustand selector of the same name in `stores/authStore.ts`. The
 * role-guard is now exclusively `useAuthGuard`. Use the authStore
 * selector for pure state reads and this hook only when you need the
 * redirect side effect.
 */
export function useAuthGuard(allowedRoles: string[] = []) {
  const navigate = useNavigate();
  const { user, isLoading, error, logout: contextLogout } = useAuthContext();
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [localIsLoading, setLocalIsLoading] = useState(true);
  const [localError, setLocalError] = useState<any>(null);

  useEffect(() => {
    // Use AuthContext state instead of making separate API calls
    if (!isLoading) {
      if (user) {
        setLocalUser(user);
        setLocalError(null);

        // If specific roles are required, check them
        if (allowedRoles.length > 0 && user.rol && !allowedRoles.includes(user.rol)) {
          safeConsoleWarn(
            `User role ${user.rol || 'undefined'} not in allowed roles: ${allowedRoles.join(', ')}`,
          );
          navigate(`/${user.rol || 'login'}`, { replace: true });
          return;
        }
      } else {
        setLocalUser(null);
        setLocalError(error);

        // Only redirect to login if not already on login page
        if (!window.location.pathname.includes('login')) {
          navigate('/login', { replace: true });
        }
      }
      setLocalIsLoading(false);
    }
  }, [user, isLoading, error, allowedRoles, navigate]);

  const logout = async () => {
    try {
      await SecureAPI.logout();
    } catch (error) {
      safeConsoleError('\u00c7\u0131k\u0131\u015f i\u015flemi ba\u015far\u0131s\u0131z:', error);
    } finally {
      // Use context logout to clear user data and redirect to login
      contextLogout();
      navigate('/login', { replace: true });
    }
  };

  return {
    user: localUser,
    logout,
    isLoading: localIsLoading,
    error: localError,
  };
}

/**
 * Example usage in a page component:
 *
 * import { useAuthGuard } from "../hooks/useAuthGuard";
 *
 * export default function SomePage() {
 *   // Only 'admin' and 'teacher' can access
 *   useAuthGuard(["admin", "teacher"]);
 *   return <div>Protected Content</div>;
 * }
 */
