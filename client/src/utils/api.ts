import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { TokenManager, CSRFProtection, RateLimiter, InputSanitizer } from './security';

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

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

  // Request interceptor for authentication and CSRF
  // ⚠️ GÜVENLİK: Token artık httpOnly cookie'de, Authorization header'a eklemeye gerek yok
  // httpOnly cookies browser tarafından otomatik olarak withCredentials: true ile gönderilir
  client.interceptors.request.use(
    (config) => {
      // httpOnly cookie'ler browser tarafından otomatik gönderilir (withCredentials: true)
      // Backward compatibility: Eğer localStorage'da token varsa Authorization header ekle
      // (Eski API endpoint'leri veya migration dönemi için)
      const token = TokenManager.getAccessToken();
      if (token && !TokenManager.isTokenExpired()) {
        config.headers.Authorization = `Bearer ${token}`;
      }

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
    }
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
      const originalRequest = (error as any)?.config;

      // Normalize error into a consistent shape for consumers
      const normalizeApiError = (err: unknown): ApiError => {
        const normalized = new Error('Unknown API error') as ApiError;

        // Axios errors
        if (axios.isAxiosError(err)) {
          const axErr = err as any;
          normalized.message = axErr.message || 'API request failed';
          normalized.code = axErr.code || undefined;
          if (axErr.response) {
            normalized.response = { status: axErr.response.status, data: axErr.response.data };
          }
        } else if (err instanceof Error) {
          normalized.message = err.message;
        } else {
          try {
            normalized.message = JSON.stringify(err as object);
          } catch (_) {
            normalized.message = String(err);
          }
        }

        return normalized;
      };

      const apiError = normalizeApiError(error);

      // Handle 401 errors (unauthorized)
      if (apiError.response?.status === 401 && !originalRequest?._retry) {
        // Don't retry if specific endpoints fail to avoid infinite loops
        const url = originalRequest.url || '';
        const isLoginRequest = url.includes('/auth/login');
        const isRefreshRequest = url.includes('/auth/refresh-token');

        if (isLoginRequest || isRefreshRequest) {
          return Promise.reject(apiError);
        }

        originalRequest._retry = true;

        try {
          // Try to refresh token
          // httpOnly cookie kullanılıyorsa refresh token da cookie'de
          // Backward compatibility için body'den de okuyabiliriz
          const refreshToken = TokenManager.getRefreshToken();

          const response = await axios.post(
            `${API_BASE_URL}/api/auth/refresh-token`,
            refreshToken ? { refreshToken } : {}, // Body'ye sadece backward compatibility için ekle
            {
              withCredentials: true, // httpOnly cookies için gerekli
            }
          );

          // Token'lar artık httpOnly cookie'de set ediliyor
          // Sadece expiry bilgisi response'da geliyor
          const { expiresIn } = response.data;

          // Backward compatibility: Eğer response'da token varsa localStorage'a da kaydet
          if (response.data.accessToken) {
            TokenManager.setTokens(
              response.data.accessToken,
              response.data.refreshToken || refreshToken || '',
              expiresIn
            );
            originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
          }

          // Retry original request
          return client(originalRequest);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          TokenManager.clearTokens();
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

        if (retryCount < maxRetries) {
          originalRequest._retryCount = retryCount + 1;
          const retryAfter = error.response.data?.retryAfter || Math.pow(2, retryCount);
          console.warn(`Rate limited. Retry ${retryCount + 1}/${maxRetries} after ${retryAfter} seconds...`);

          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return client(originalRequest);
        } else {
          console.error('Max retries exceeded for rate limited request');
          return Promise.reject(apiError);
        }
      }

      return Promise.reject(apiError);
    }
  );

  return client;
};

// Secure API client instance
export const apiClient = createSecureApiClient();

// Rate-limited API methods
export class SecureAPI {
  private static readonly LOGIN_ATTEMPTS_KEY = 'login_attempts';
  private static readonly LOGIN_MAX_ATTEMPTS = 5;
  private static readonly LOGIN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  // Authentication methods
  static async login(_id: string, _sifre: string, credentials: { id: string; sifre: string; }) {
    // Check rate limit
    const rateLimitResult = RateLimiter.checkLimit(this.LOGIN_ATTEMPTS_KEY, this.LOGIN_MAX_ATTEMPTS, this.LOGIN_WINDOW_MS);
    if (!rateLimitResult.allowed) {
      throw new Error('Çok fazla giriş denemesi. Lütfen 5 dakika sonra tekrar deneyin.');
    }

    try {
      // ⚠️ GÜVENLİK: withCredentials: true - httpOnly cookies için gerekli
      const response = await apiClient.post('/api/auth/login', credentials, {
        withCredentials: true,
      });

      // Clear rate limit on successful login
      RateLimiter.clearAttempts(this.LOGIN_ATTEMPTS_KEY);

      // Extract tokens from response (backward compatibility during migration)
      // Token'lar artık httpOnly cookie'de, response'da sadece expiry bilgisi var
      const { accessToken, refreshToken, expiresIn, user, ...otherData } = response.data;

      // Backward compatibility: Eğer response'da token varsa localStorage'a da kaydet
      // (Migration dönemi için - sonra kaldırılacak)
      if (accessToken) {
        TokenManager.setTokens(accessToken, refreshToken, expiresIn || 900); // 15 minutes default

        // Also store tokens with alternative keys for compatibility
        localStorage.setItem('accessToken', accessToken);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
      }

      // Return the user data - ensure we return the user object, not the entire response
      if (user) {
        return { user };
      } else {
        // Fallback: if user data is at root level, wrap it
        return { user: otherData };
      }
    } catch (error: unknown) {

      // Use the existing error handling infrastructure
      const { extractError } = await import('./apiResponseHandler');
      const errorMessage = extractError(error);

      // Check if the API response contains a specific error message
      const apiError = error as ApiError;
      if (apiError.response?.data?.error || apiError.response?.data?.message) {
        const apiErrorMessage = apiError.response.data.error || apiError.response.data.message;
        throw new Error(apiErrorMessage);
      }

      // Provide more specific error messages based on error type
      if (apiError.response?.status === 401) {
        // Check if it's actually an authentication failure or something else
        if (apiError.response?.data?.error === 'Invalid credentials' ||
          apiError.response?.data?.message === 'Invalid credentials' ||
          apiError.response?.data?.error === 'Invalid username or password' ||
          apiError.response?.data?.message === 'Invalid username or password') {
          throw new Error('Kullanıcı adı veya şifre hatalı');
        } else {
          // Generic 401 error - could be token issues, etc.
          throw new Error(errorMessage || 'Yetkilendirme hatası. Lütfen tekrar deneyin.');
        }
      } else if (apiError.response?.status === 429) {
        throw new Error('Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin.');
      } else if (apiError.response?.status && apiError.response.status >= 500) {
        throw new Error('Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
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
    try {
      const response = await apiClient.get('/api/auth/me');
      return response;
    } catch (error) {
      throw error;
    }
  }

  // User management methods
  static async updateProfile(data: { adSoyad?: string; sifre?: string; userId?: string }) {
    // Use userId from data if provided, otherwise this will need to be handled by caller
    const userId = data.userId;
    if (!userId) {
      throw new Error('userId is required for profile update');
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