import { createContext, useContext, useEffect, useRef } from "react";
import { useUser, useIsLoading, useError, useLogin, useLogout, useCheckAuth } from "../stores/authStore";
import { User } from '../types/user';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: unknown;
  login: (id: string, sifre: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useUser();
  const isLoading = useIsLoading();
  const error = useError();
  const login = useLogin();
  const logout = useLogout();
  const checkAuth = useCheckAuth();
  const hasInitialized = useRef(false);

  // Initialize auth check on mount only once
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      checkAuth();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      error,
      login,
      logout,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthContext must be used within AuthProvider");
  return context;
}
