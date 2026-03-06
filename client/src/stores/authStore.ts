import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SecureAPI } from '../utils/api';
import { AppError, ErrorType, ErrorSeverity, ErrorContext } from '../utils/AppError';
import { User } from '../types/user';
import { TokenManager } from '../utils/security';
import { AxiosResponse } from 'axios';

// httpOnly cookies are now used for authentication
// No need to check token expiration from localStorage

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: AppError | string | null;
  isAuthenticated: boolean;
  requires2FA: boolean;
  twoFactorSessionToken: string | null; // Deprecated: now in httpOnly cookie
  twoFactorUser: { id: string; adSoyad: string } | null;
  twoFactorExpiresAt: number | null; // #14: Countdown timer
}

interface AuthActions {
  login: (id: string, sifre: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  updateUser: (user: Partial<User>) => void;
  verify2FA: (code: string, rememberDevice: boolean) => Promise<void>;
  resend2FA: () => Promise<void>;
  cancel2FA: () => void;
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
      requires2FA: false,
      twoFactorSessionToken: null,
      twoFactorUser: null,
      twoFactorExpiresAt: null,

      // Actions
      login: async (id: string, sifre: string) => {
        try {
          set({ isLoading: true, error: null });

          const response = await SecureAPI.login(id, sifre, { id, sifre });

          // Check if 2FA is required
          if ((response as any).requires2FA) {
            set({
              requires2FA: true,
              twoFactorSessionToken: null, // #10: Token is now in httpOnly cookie
              twoFactorUser: (response as any).user,
              twoFactorExpiresAt: (response as any).twoFactorExpiresAt || null, // #14: countdown
              isLoading: false,
              error: null,
              isAuthenticated: false,
            });
            return;
          }

          const userData = response.user;

          if (!userData || !userData.rol) {
            throw AppError.server('Geçersiz kullanıcı verisi alındı');
          }

          const user: User = {
            id: String(userData.id || ''),
            adSoyad: String(userData.adSoyad || ''),
            rol: String(userData.rol || '') as 'admin' | 'teacher' | 'student' | 'parent' | 'hizmetli' | 'ziyaretci',
            ...(userData.email && { email: String(userData.email) }),
            emailVerified: Boolean(userData.emailVerified),
            twoFactorEnabled: Boolean(userData.twoFactorEnabled),
            ...(userData.sinif && { sinif: String(userData.sinif) }),
            ...(userData.sube && { sube: String(userData.sube) }),
            ...(userData.oda && { oda: String(userData.oda) }),
            pansiyon: Boolean(userData.pansiyon),
            ...(userData.childrenSiniflar && { childrenSiniflar: userData.childrenSiniflar }),
            ...(userData.childId && { childId: userData.childId })
          };

          // Tokens are handled by SecureAPI.login internally if present

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            requires2FA: false,
            twoFactorSessionToken: null,
            twoFactorUser: null,
          });
        } catch (error) {
          const mapToAppError = (err: unknown): AppError => {
            if (err instanceof AppError) return err;

            const errObj = err as unknown as Record<string, unknown>;
            const resp = errObj['response'] as Record<string, unknown> | undefined;
            const respData = resp?.['data'] as Record<string, unknown> | undefined;
            const messageFromResp = respData ? ((typeof respData['message'] === 'string' ? respData['message'] : (typeof respData['error'] === 'string' ? respData['error'] : undefined))) : undefined;
            const status = resp?.['status'] as number | undefined;

            const config = errObj['config'] as Record<string, unknown> | undefined;
            const context: Partial<ErrorContext> = {};

            if (status !== undefined) context.statusCode = status;
            if (respData !== undefined) context.response = respData;
            if (typeof config?.['url'] === 'string') context.url = config['url'];
            if (typeof config?.['method'] === 'string') context.method = config['method'];

            if (status === 400) return AppError.validation(messageFromResp || 'İstek doğrulama hatası', context);
            if (status === 401) return AppError.unauthorized(messageFromResp || 'Yetkilendirme hatası', context);
            if (status === 403) return AppError.forbidden(messageFromResp || 'Erişim yasak', context);
            if (status === 404) return AppError.notFound(messageFromResp || 'Kaynak bulunamadı', context);
            if (status === 429) return AppError.rateLimit(messageFromResp || 'Çok fazla istek', context);
            if (status && status >= 500) return AppError.server(messageFromResp || 'Sunucu hatası oluştu', context);

            const code = errObj['code'] as string | undefined;
            const msg = errObj['message'] as string | undefined;
            if (code === 'NETWORK_ERROR' || (msg && msg.includes('Network'))) {
              return AppError.network(messageFromResp || msg || 'Bağlantı hatası', context);
            }

            return new AppError(
              (errObj['message'] as string) || 'Giriş yapılırken hata oluştu',
              (errObj['type'] as string) || (errObj['code'] as string) || ErrorType.UNKNOWN,
              ErrorSeverity.MEDIUM,
              context,
              err instanceof Error ? err : undefined
            );
          };

          const appError = mapToAppError(error);

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: appError
          });

          throw appError;
        }
      },

      logout: async () => {
        // Legacy localStorage cleanup
        TokenManager.clearTokens();
        localStorage.removeItem('user');
        localStorage.removeItem('csrf_token');

        set({
          user: null,
          isAuthenticated: false,
          error: null,
          isLoading: false
        });

        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
          });
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Logout API call failed:', error);
          }
        }
      },

      checkAuth: async () => {
        try {
          set({ isLoading: true, error: null });

          const buildUser = (userData: any): User => ({
            id: String(userData.id || ''),
            adSoyad: String(userData.adSoyad || ''),
            rol: String(userData.rol || '') as 'admin' | 'teacher' | 'student' | 'parent' | 'hizmetli' | 'ziyaretci',
            ...(userData.email && { email: String(userData.email) }),
            emailVerified: userData.emailVerified === true,
            twoFactorEnabled: Boolean(userData.twoFactorEnabled),
            ...(userData.sinif && { sinif: String(userData.sinif) }),
            ...(userData.sube && { sube: String(userData.sube) }),
            ...(userData.oda && { oda: String(userData.oda) }),
            pansiyon: Boolean(userData.pansiyon),
            ...(userData.childrenSiniflar && { childrenSiniflar: userData.childrenSiniflar }),
            ...(userData.childId && { childId: userData.childId })
          });

          // httpOnly cookie ile kullanıcı bilgisini al
          try {
            const response = await SecureAPI.getCurrentUser() as AxiosResponse;
            const userData = response.data?.user || response.data;

            if (userData && userData.rol) {
              set({ user: buildUser(userData), isAuthenticated: true, isLoading: false });
            } else {
              set({ isLoading: false, isAuthenticated: false, user: null });
            }
          } catch (error) {
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
      },

      verify2FA: async (code: string, rememberDevice: boolean) => {
        try {
          set({ isLoading: true, error: null });

          // #10: Session token is now in httpOnly cookie, not sent in body
          const response = await SecureAPI.post<any>('/api/auth/verify-2fa', {
            code,
            rememberDevice,
          });

          const respData = (response as any).data || response;
          const userData = respData.user;

          if (!userData || !userData.rol) {
            throw AppError.server('Geçersiz kullanıcı verisi alındı');
          }

          // Token'lar httpOnly cookie olarak set ediliyor (sunucu tarafından)

          const user: User = {
            id: String(userData.id || ''),
            adSoyad: String(userData.adSoyad || ''),
            rol: String(userData.rol || '') as 'admin' | 'teacher' | 'student' | 'parent' | 'hizmetli' | 'ziyaretci',
            ...(userData.email && { email: String(userData.email) }),
            emailVerified: Boolean(userData.emailVerified),
            twoFactorEnabled: Boolean(userData.twoFactorEnabled),
            ...(userData.sinif && { sinif: String(userData.sinif) }),
            ...(userData.sube && { sube: String(userData.sube) }),
            ...(userData.oda && { oda: String(userData.oda) }),
            pansiyon: Boolean(userData.pansiyon),
          };

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            requires2FA: false,
            twoFactorSessionToken: null,
            twoFactorUser: null,
            twoFactorExpiresAt: null,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // #13: Resend 2FA code
      resend2FA: async () => {
        try {
          // Session token is in httpOnly cookie, browser sends it automatically
          const response = await SecureAPI.post<any>('/api/auth/resend-2fa', {});
          const respData = (response as any).data || response;
          set({
            twoFactorExpiresAt: respData.twoFactorExpiresAt || null,
          });
        } catch (error) {
          throw error;
        }
      },

      cancel2FA: () => {
        set({
          requires2FA: false,
          twoFactorSessionToken: null,
          twoFactorUser: null,
          twoFactorExpiresAt: null,
          error: null,
        });
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
export const useRequires2FA = () => useAuthStore((state) => state.requires2FA);
export const useTwoFactorUser = () => useAuthStore((state) => state.twoFactorUser);
export const useTwoFactorExpiresAt = () => useAuthStore((state) => state.twoFactorExpiresAt);

// Action selectors
export const useLogin = () => useAuthStore((state) => state.login);
export const useLogout = () => useAuthStore((state) => state.logout);
export const useCheckAuth = () => useAuthStore((state) => state.checkAuth);
export const useClearError = () => useAuthStore((state) => state.clearError);
export const useSetLoading = () => useAuthStore((state) => state.setLoading);
export const useUpdateUser = () => useAuthStore((state) => state.updateUser);
export const useVerify2FA = () => useAuthStore((state) => state.verify2FA);
export const useResend2FA = () => useAuthStore((state) => state.resend2FA);
export const useCancel2FA = () => useAuthStore((state) => state.cancel2FA);

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
  const verify2FA = useVerify2FA();
  const resend2FA = useResend2FA();
  const cancel2FA = useCancel2FA();

  return { login, logout, checkAuth, clearError, setLoading, updateUser, verify2FA, resend2FA, cancel2FA };
};