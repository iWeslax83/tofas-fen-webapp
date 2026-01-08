import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SecureAPI } from '../utils/api';
import { AppError } from '../utils/AppError';
import { User } from '../types/user';

// Token expiration check
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
};

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (id: string, sifre: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  updateUser: (user: Partial<User>) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      // Actions
      // ⚠️ GÜVENLİK: Token'lar artık httpOnly cookie'de saklanıyor
      // localStorage'a kaydetmeye gerek yok (XSS koruması)
      login: async (id: string, sifre: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await SecureAPI.login(id, sifre, { id, sifre });
          const userData = response.user;
          
          if (!userData || !userData.rol) {
            throw AppError.server('Geçersiz kullanıcı verisi alındı');
          }
          
          const user: User = {
            id: String(userData.id || ''),
            adSoyad: String(userData.adSoyad || ''),
            rol: String(userData.rol || '') as 'admin' | 'teacher' | 'student' | 'parent' | 'hizmetli',
            ...(userData.email && { email: String(userData.email) }),
            ...(userData.sinif && { sinif: String(userData.sinif) }),
            ...(userData.sube && { sube: String(userData.sube) }),
            ...(userData.oda && { oda: String(userData.oda) }),
            pansiyon: Boolean(userData.pansiyon)
          };
          
          // Token'lar httpOnly cookie'de, localStorage'a kaydetmeye gerek yok
          // Backward compatibility: Eğer response'da token varsa kaydet (migration dönemi için)
          if (response.accessToken && response.refreshToken) {
            TokenManager.setTokens(
              response.accessToken,
              response.refreshToken,
              response.expiresIn || 900
            );
          }
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
        } catch (error) {
          const mapToAppError = (err: unknown): AppError => {
            if (err instanceof AppError) return err;

            const anyErr = err as any;
            const resp = anyErr?.response;
            const respData = resp?.data;
            const messageFromResp = respData?.message || respData?.error;
            const status = resp?.status;

            const context = {
              statusCode: status,
              response: respData,
              original: anyErr
            } as Record<string, unknown>;

            if (status === 400) return AppError.validation(messageFromResp || 'İstek doğrulama hatası', context);
            if (status === 401) return AppError.unauthorized(messageFromResp || 'Yetkilendirme hatası', context);
            if (status === 403) return AppError.forbidden(messageFromResp || 'Erişim yasak', context);
            if (status === 404) return AppError.notFound(messageFromResp || 'Kaynak bulunamadı', context);
            if (status === 429) return AppError.rateLimit(messageFromResp || 'Çok fazla istek', context);
            if (status && status >= 500) return AppError.server(messageFromResp || 'Sunucu hatası oluştu', context);

            if (anyErr?.code === 'NETWORK_ERROR' || (anyErr?.message && anyErr.message.includes('Network'))) {
              return AppError.network(messageFromResp || anyErr.message || 'Bağlantı hatası', context);
            }

            if (anyErr?.message) return new AppError(anyErr.message, anyErr?.code || 'UNKNOWN_ERROR', anyErr?.statusCode, true, context);

            return AppError.server('Giriş yapılırken hata oluştu', context);
          };

          const appError = mapToAppError(error);

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: appError.getUserMessage()
          });

          throw appError;
        }
      },

      logout: async () => {
        try {
          // Call backend logout to clear httpOnly cookies
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include', // Important for cookies
          });
        } catch (error) {
          console.error('Logout API call failed:', error);
        }
        
        // Clear all possible token keys (backward compatibility)
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token_expiry');
        localStorage.removeItem('csrf_token');
        
        set({
          user: null,
          isAuthenticated: false,
          error: null,
          isLoading: false
        });
      },

      checkAuth: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // Check if we have a valid token - check both possible keys
          const token = localStorage.getItem('accessToken') || localStorage.getItem('auth_token');
          if (!token) {
            set({ isLoading: false, isAuthenticated: false, user: null });
            return;
          }
          
          // Check if token is expired
          if (isTokenExpired(token)) {
            // Clear all possible token keys
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('token_expiry');
            set({ isLoading: false, isAuthenticated: false, user: null });
            return;
          }
          
          // If we have a valid token, try to get user info
          try {
            const response = await SecureAPI.getCurrentUser();
            const userData = response.data?.user || response.data;
            
            if (userData && userData.rol) {
              const user: User = {
                id: String(userData.id || ''),
                adSoyad: String(userData.adSoyad || ''),
                rol: String(userData.rol || '') as 'admin' | 'teacher' | 'student' | 'parent' | 'hizmetli',
                ...(userData.email && { email: String(userData.email) }),
                ...(userData.sinif && { sinif: String(userData.sinif) }),
                ...(userData.sube && { sube: String(userData.sube) }),
                ...(userData.oda && { oda: String(userData.oda) }),
                pansiyon: Boolean(userData.pansiyon)
              };
              
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null
              });
            } else {
              // Invalid user data, clear auth
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('auth_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('token_expiry');
              set({ isLoading: false, isAuthenticated: false, user: null });
            }
          } catch (error) {
            // Token is invalid or expired, clear auth
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('token_expiry');
            set({ isLoading: false, isAuthenticated: false, user: null });
          }
        } catch (error) {
          set({ isLoading: false, isAuthenticated: false, user: null, error: 'Auth check failed' });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData }
          });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated })
    }
  )
);

// Individual selectors to prevent object recreation
export const useUser = () => useAuthStore((state) => state.user);
export const useIsLoading = () => useAuthStore((state) => state.isLoading);
export const useError = () => useAuthStore((state) => state.error);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);

// Action selectors
export const useLogin = () => useAuthStore((state) => state.login);
export const useLogout = () => useAuthStore((state) => state.logout);
export const useCheckAuth = () => useAuthStore((state) => state.checkAuth);
export const useClearError = () => useAuthStore((state) => state.clearError);
export const useSetLoading = () => useAuthStore((state) => state.setLoading);
export const useUpdateUser = () => useAuthStore((state) => state.updateUser);

// Combined selectors - use these sparingly to avoid object recreation
export const useAuth = () => {
  const user = useUser();
  const isLoading = useIsLoading();
  const error = useError();
  const isAuthenticated = useIsAuthenticated();
  
  return { user, isLoading, error, isAuthenticated };
};

export const useAuthActions = () => {
  const login = useLogin();
  const logout = useLogout();
  const checkAuth = useCheckAuth();
  const clearError = useClearError();
  const setLoading = useSetLoading();
  const updateUser = useUpdateUser();
  
  return { login, logout, checkAuth, clearError, setLoading, updateUser };
};