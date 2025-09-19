import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { TokenManager } from "../utils/security";
import { SecureAPI } from "../utils/api";
import { UserService } from "../utils/apiService";
import { User, UserResponse } from "../types/user";
import { useErrorHandler } from "../utils/errorHandling";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (id: string, sifre: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { handleError } = useErrorHandler();

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First, check if we have user data in localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          
          if (parsedUser && parsedUser.rol) {
            // Check if token is still valid
            const token = TokenManager.getAccessToken();
            if (token && !TokenManager.isTokenExpired()) {
              // Token is valid, restore user from localStorage
              setUser(parsedUser);
              setError(null);
              setIsLoading(false);
              return;
            } else {
              // Token expired, clear stored user and try to refresh
              localStorage.removeItem('user');
            }
          }
        } catch {
          // Invalid stored user data, clearing
          localStorage.removeItem('user');
        }
      }
      
      // Check if we have a valid token
      const token = TokenManager.getAccessToken();
      
      if (!token || TokenManager.isTokenExpired()) {
        // No valid token found, clearing state
        setUser(null);
        setError(null);
        setIsLoading(false);
        return;
      }
      
      // Valid token found, fetching user data...
      const res = await UserService.getCurrentUser();
      const userData = res.data as User;
      
      if (!userData || !userData.rol) {
        // No valid user data received, clearing tokens
        throw new Error('No valid user data received');
      }
      
      // Set user in context
      const user: User = {
        id: userData.id,
        adSoyad: userData.adSoyad,
        rol: userData.rol,
        email: userData.email,
        sinif: userData.sinif,
        sube: userData.sube,
        oda: userData.oda,
        pansiyon: userData.pansiyon
      };
      
      setUser(user);
      setError(null);
      
      // Store in localStorage for consistency
      localStorage.setItem('user', JSON.stringify(user));
      
    } catch (error) {
      console.error('[AuthContext] Authentication error:', error);
      handleError(error as Error, {
        component: 'AuthContext',
        action: 'checkAuth'
      });
      setError(error as Error);
      setUser(null);
      TokenManager.clearTokens();
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (id: string, sifre: string) => {
    try {
      setIsLoading(true);
      setError(null);
      // Starting login...
      
      const response = await SecureAPI.login(id, sifre, { id, sifre }) as UserResponse;
      
      // Extract user data from response
      const userData = response.user;
      
      if (!userData || !userData.rol) {
        // Invalid user data
        throw new Error('Invalid user data received - missing role');
      }
      
      // Set user in context
      const user: User = {
        id: userData.id,
        adSoyad: userData.adSoyad,
        rol: userData.rol,
        email: userData.email,
        sinif: userData.sinif,
        sube: userData.sube,
        oda: userData.oda,
        pansiyon: userData.pansiyon
      };
      
      setUser(user);
      
      // Store in localStorage for consistency
      localStorage.setItem('user', JSON.stringify(user));
      
      setError(null);
    } catch (error) {
      handleError(error as Error, {
        component: 'AuthContext',
        action: 'login',
        userId: id
      });
      setError(error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    TokenManager.clearTokens();
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthContext must be used within AuthProvider");
  return context;
}
