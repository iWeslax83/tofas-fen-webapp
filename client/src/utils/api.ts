import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { TokenManager, CSRFProtection, RateLimiter, InputSanitizer } from './security';
import { safeConsoleWarn } from '../utils/safeLogger';

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode: number;
}

// Error types
interface ApiError extends Error {
  code?: string;
  response?: {
    status: number;
    data?: {
      error?: string;
      message?: string;
    };
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API Configuration (F-M13: fail-loud on misbuilt prod images).
//
// A silent fallback to http://localhost:3001 is fine for local dev, but if a
// production build is shipped without VITE_API_URL — or with a plaintext HTTP
// value — the client will happily talk to the dev server or leak auth cookies
// over the wire. Detect that at module load so the failure is obvious.
function resolveApiBaseUrl(): string {
  const value = import.meta.env.VITE_API_URL;
  if (import.meta.env.PROD) {
    if (!value) {
      throw new Error(
        'VITE_API_URL must be set at build time in production. ' +
          'Check your CI build args / Dockerfile ARG.',
      );
    }
    if (!/^https:\/\//i.test(value)) {
      throw new Error(
        `VITE_API_URL must use https:// in production (got: ${value}). ` +
          'Plaintext HTTP would leak auth cookies over the wire.',
      );
    }
    return value;
  }
  return value || 'http://localhost:3001';
}

const API_BASE_URL = resolveApiBaseUrl();

// Create axios instance with security features
// ⚠️ GÜVENLİK: withCredentials: true - httpOnly cookies için gerekli
const createSecureApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 120000, // 2 dakika timeout
    withCredentials: true, // httpOnly cookies için gerekli
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  // Request interceptor for CSRF and sanitization
  // ⚠️ GÜVENLİK: Token artık httpOnly cookie'de, browser otomatik gönderir (withCredentials: true)
  client.interceptors.request.use(
    (config) => {
      // httpOnly cookie'ler browser tarafından otomatik gönderilir (withCredentials: true)
      // localStorage'da token saklanmıyor

      // Add CSRF token
      const csrfToken = CSRFProtection.getToken();
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }

      // Sanitize request data
      if (config.data && typeof config.data === 'object') {
        config.data = InputSanitizer.sanitizeObject(config.data);
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  // Response interceptor for token refresh and error handling
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      // Extract CSRF token from response headers
      const csrfToken = response.headers['x-csrf-token'];
      if (csrfToken) {
        CSRFProtection.setToken(csrfToken);
      }

      return response;
    },
    async (error) => {
      const originalRequest = (
        error as ApiError & {
          config?: AxiosRequestConfig & { _retry?: boolean; _retryCount?: number };
        }
      )?.config;

      // Normalize error into a consistent shape for consumers
      const normalizeApiError = (err: unknown): ApiError => {
        const normalized = new Error('Bilinmeyen hata') as ApiError;

        // Axios errors
        if (axios.isAxiosError(err)) {
          normalized.message = err.message || 'API isteği başarısız';
          normalized.code = err.code || undefined;
          if (err.response) {
            normalized.response = {
              status: err.response.status,
              data: err.response.data as { error?: string; message?: string },
            };
          }
        } else if (err instanceof Error) {
          normalized.message = err.message;
        } else {
          try {
            normalized.message = JSON.stringify(err as object);
          } catch (_err) {
            normalized.message = String(err);
          }
        }

        return normalized;
      };

      const apiError = normalizeApiError(error);

      // Handle 401 errors (unauthorized) with mutex to prevent concurrent refreshes
      if (apiError.response?.status === 401 && !originalRequest?._retry) {
        // Don't retry if specific endpoints fail to avoid infinite loops
        const url = originalRequest.url || '';
        const isLoginRequest = url.includes('/auth/login');
        const isRefreshRequest = url.includes('/auth/refresh-token');
        const isAuthCheck = url.includes('/auth/me');

        if (isLoginRequest || isRefreshRequest) {
          return Promise.reject(apiError);
        }

        // Don't attempt token refresh on the login page — no valid session is expected
        if (window.location.pathname === '/login') {
          return Promise.reject(apiError);
        }

        // Don't attempt refresh for auth check if there's no refresh token cookie
        // (browser won't expose httpOnly cookies, but if we're not authenticated, skip)
        if (isAuthCheck && !document.cookie.includes('accessToken')) {
          return Promise.reject(apiError);
        }

        originalRequest._retry = true;

        // Eğer zaten bir refresh işlemi devam ediyorsa, sıraya gir
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            subscribeToTokenRefresh((success: boolean) => {
              if (success) {
                resolve(client(originalRequest));
              } else {
                reject(apiError);
              }
            });
          });
        }

        isRefreshing = true;

        try {
          // httpOnly cookie'deki refresh token ile yenileme yap
          await axios.post(
            `${API_BASE_URL}/api/auth/refresh-token`,
            {},
            {
              withCredentials: true,
            },
          );

          isRefreshing = false;
          onRefreshComplete(true);

          // Orijinal isteği tekrarla
          return client(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;
          onRefreshComplete(false);

          // Refresh failed, redirect to login
          TokenManager.clearTokens(); // Legacy cleanup
          CSRFProtection.clearToken();

          // Only redirect if not already on login page to prevent infinite loops
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }

          return Promise.reject(refreshError);
        }
      }

      // Handle 429 Too Many Requests with exponential backoff
      if (apiError.response?.status === 429) {
        const retryCount = originalRequest._retryCount || 0;
        const maxRetries = 3;
        const serverRetryAfter = error.response?.data?.retryAfter;

        // If server says to wait more than 30 seconds, don't auto-retry — surface the error
        if (serverRetryAfter && serverRetryAfter > 30) {
          return Promise.reject(apiError);
        }

        if (retryCount < maxRetries) {
          originalRequest._retryCount = retryCount + 1;
          const retryAfter = Math.min(serverRetryAfter || Math.pow(2, retryCount), 10);
          safeConsoleWarn(
            `Çok fazla istek. ${retryCount + 1}/${maxRetries} yeniden deneme ${retryAfter} saniye sonra...`,
          );

          // Exponential backoff capped at 10 seconds
          await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
          return client(originalRequest);
        } else {
          return Promise.reject(apiError);
        }
      }

      return Promise.reject(apiError);
    },
  );

  return client;
};

// Token refresh mutex - prevents concurrent refresh requests
let isRefreshing = false;
let refreshSubscribers: ((success: boolean) => void)[] = [];

function subscribeToTokenRefresh(callback: (success: boolean) => void) {
  refreshSubscribers.push(callback);
}

function onRefreshComplete(success: boolean) {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
}

// Secure API client instance
export const apiClient = createSecureApiClient();

// Rate-limited API methods
export class SecureAPI {
  private static readonly LOGIN_ATTEMPTS_KEY = 'login_attempts';
  private static readonly LOGIN_MAX_ATTEMPTS = 5;
  private static readonly LOGIN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  // Authentication methods
  static async login(_id: string, _sifre: string, credentials: { id: string; sifre: string }) {
    // Check rate limit
    const rateLimitResult = RateLimiter.checkLimit(
      this.LOGIN_ATTEMPTS_KEY,
      this.LOGIN_MAX_ATTEMPTS,
      this.LOGIN_WINDOW_MS,
    );
    if (!rateLimitResult.allowed) {
      throw new Error('Çok fazla giriş denemesi. Lütfen 5 dakika sonra tekrar deneyin.');
    }

    try {
      // ⚠️ GÜVENLİK: withCredentials: true - httpOnly cookies için gerekli
      const response = await apiClient.post('/api/auth/login', credentials, {
        withCredentials: true,
      });

      // Check if 2FA is required
      if (response.data.requires2FA) {
        RateLimiter.clearAttempts(this.LOGIN_ATTEMPTS_KEY);
        return {
          requires2FA: true,
          twoFactorSessionToken: response.data.twoFactorSessionToken,
          user: response.data.user,
        };
      }

      // Clear rate limit on successful login
      RateLimiter.clearAttempts(this.LOGIN_ATTEMPTS_KEY);

      // Token'lar httpOnly cookie'de set ediliyor (sunucu tarafından)
      // Client-side token saklaması yok
      const { user, ...otherData } = response.data;

      // Return the user data - ensure we return the user object, not the entire response
      if (user) {
        return { user };
      } else {
        // Fallback: if user data is at root level, wrap it
        return { user: otherData };
      }
    } catch (error: unknown) {
      // Normalize and extract a human-friendly message
      const { extractError } = await import('./apiResponseHandler');
      const errorMessage = extractError(error);

      const apiError = error as ApiError;
      const respData = apiError.response?.data as Record<string, unknown> | undefined;

      // Prefer explicit message locations, and handle nested `error: { message: '...' }`
      let apiErrorMessage: string | undefined;
      if (respData) {
        const respError = respData.error;
        if (typeof respError === 'string') apiErrorMessage = respError;
        else if (
          respError &&
          typeof respError === 'object' &&
          typeof (respError as Record<string, unknown>).message === 'string'
        )
          apiErrorMessage = (respError as Record<string, unknown>).message as string;
        else if (typeof respData.message === 'string') apiErrorMessage = respData.message as string;
        else if (Array.isArray(respData.errors) && respData.errors.length > 0)
          apiErrorMessage = (respData.errors as unknown[])
            .map((e: unknown) =>
              typeof e === 'string' ? e : (e as Record<string, unknown>)?.message,
            )
            .filter(Boolean)
            .join(', ');
      }

      if (apiErrorMessage) {
        throw new Error(apiErrorMessage);
      }

      // Handle common HTTP-based issues
      if (apiError.response?.status === 401) {
        throw new Error(errorMessage || 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
      } else if (apiError.response?.status === 429) {
        throw new Error('Çok fazla deneme yapılmıştır. Lütfen daha sonra tekrar deneyin.');
      } else if (apiError.response?.status && apiError.response.status >= 500) {
        throw new Error('Sunucu hatasından kaynaklandı. Lütfen daha sonra tekrar deneyin.');
      } else if (apiError.code === 'NETWORK_ERROR' || apiError.message?.includes('Network Error')) {
        throw new Error('Bağlantı hatası. İnternet bağlantınızı kontrol edin.');
      } else if (errorMessage && errorMessage !== 'Bilinmeyen hata') {
        throw new Error(errorMessage);
      } else {
        throw new Error('Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    }
  }

  static async logout() {
    try {
      await apiClient.post('/api/auth/logout');
    } finally {
      // Always clear tokens on logout
      TokenManager.clearTokens();
      CSRFProtection.clearToken();
    }
  }

  static async getCurrentUser() {
    return apiClient.get('/api/auth/me');
  }

  // User management methods
  static async updateProfile(data: { adSoyad?: string; sifre?: string; userId?: string }) {
    // Use userId from data if provided, otherwise this will need to be handled by caller
    const userId = data.userId;
    if (!userId) {
      throw new Error('Profil güncellemesi için kullanıcı ID gereklidir');
    }
    const { userId: _, ...updateData } = data;
    return apiClient.put(`/api/user/${userId}/update`, updateData);
  }

  // Şifre değiştirme fonksiyonu kaldırıldı - artık TCKN kullanılıyor

  // Generic API methods with security
  static async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.get(url, config);
  }

  static async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.post(url, data, config);
  }

  static async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.put(url, data, config);
  }

  static async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.patch(url, data, config);
  }

  static async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.delete(url, config);
  }

  static async upload<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.post(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
    });
  }
}

// Export the secure client for direct use if needed
export default apiClient;
