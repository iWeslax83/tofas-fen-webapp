import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { SecureAPI } from '../utils/api';
import { useAuthContext } from '../contexts/AuthContext';

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
 * Hook to handle authentication state and user info
 * @param allowedRoles Array of roles that can access the page
 * @returns Object containing user info and auth methods
 */
export function useAuth(allowedRoles: string[] = []) {
  const navigate = useNavigate();
  const { user, isLoading, error, logout: contextLogout } = useAuthContext();
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [localIsLoading, setLocalIsLoading] = useState(true);
  const [localError, setLocalError] = useState<Error | null>(null);

  useEffect(() => {
    // Use AuthContext state instead of making separate API calls
    if (!isLoading) {
      if (user) {
        setLocalUser(user);
        setLocalError(null);
        
        // If specific roles are required, check them
        if (allowedRoles.length > 0 && user.rol && !allowedRoles.includes(user.rol)) {
          console.warn(`User role ${user.rol} not in allowed roles:`, allowedRoles);
          navigate(`/${user.rol || 'login'}`, { replace: true });
          return;
        }
      } else {
        setLocalUser(null);
        setLocalError(error);
        
        // Only redirect to login if not already on login page
        if (!window.location.pathname.includes('login')) {
          navigate("/login", { replace: true });
        }
      }
      setLocalIsLoading(false);
    }
  }, [user, isLoading, error, allowedRoles, navigate]);

  const logout = async () => {
    try {
      await SecureAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
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
    error: localError 
  };
}

/**
 * Example usage in a page component:
 *
 * import { useAuth } from "../hooks/useAuth";
 *
 * export default function SomePage() {
 *   // Only 'admin' and 'teacher' can access
 *   useAuth(["admin", "teacher"]);
 *   return <div>Protected Content</div>;
 * }
 */
