import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { TokenManager, CSRFProtection, RateLimiter, InputSanitizer } from './security';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode: number;
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
const createSecureApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 120000, // 2 dakika timeout
    withCredentials: false, // JWT token'ları localStorage'da saklandığı için false
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  // Request interceptor for authentication and CSRF
  client.interceptors.request.use(
    (config) => {
      // Add JWT token if available
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
      const originalRequest = error.config;

      // Handle 401 errors (unauthorized)
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // Try to refresh token
          const refreshToken = TokenManager.getRefreshToken();
          if (refreshToken) {
            const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
              refreshToken
            }, { withCredentials: false });

            const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;
            TokenManager.setTokens(accessToken, newRefreshToken, expiresIn);

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return client(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          TokenManager.clearTokens();
          CSRFProtection.clearToken();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      // Handle 429 Too Many Requests with exponential backoff
      if (error.response?.status === 429) {
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
          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
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
  static async login(id: string, sifre: string, credentials: { id: string; sifre: string; }) {
    // Check rate limit
    const rateLimitResult = RateLimiter.checkLimit(this.LOGIN_ATTEMPTS_KEY, this.LOGIN_MAX_ATTEMPTS, this.LOGIN_WINDOW_MS);
    if (!rateLimitResult.allowed) {
      throw new Error('Çok fazla giriş denemesi. Lütfen 5 dakika sonra tekrar deneyin.');
    }

    try {
      const response = await apiClient.post('/api/auth/login', credentials);
      
      // Clear rate limit on successful login
      RateLimiter.clearAttempts(this.LOGIN_ATTEMPTS_KEY);
      
      // Extract and store tokens from response
      const { accessToken, refreshToken, expiresIn, user, ...otherData } = response.data;
      
      if (accessToken) {
        TokenManager.setTokens(accessToken, refreshToken, expiresIn || 900); // 15 minutes default
      } else {
        throw new Error('Login response does not contain access token');
      }
      
      // Return the user data - handle both nested and flat structures
      const userData = user || otherData;
      return userData;
    } catch (error: unknown) {
      
      // Use the existing error handling infrastructure
      const { extractError } = await import('./apiResponseHandler');
      const errorMessage = extractError(error);
      
      // Check if the API response contains a specific error message
      if ((error as any).response?.data?.error || (error as any).response?.data?.message) {
        const apiErrorMessage = (error as any).response.data.error || (error as any).response.data.message;
        throw new Error(apiErrorMessage);
      }
      
      // Provide more specific error messages based on error type
      if ((error as any).response?.status === 401) {
        // Check if it's actually an authentication failure or something else
        if ((error as any).response?.data?.error === 'Invalid credentials' || 
            (error as any).response?.data?.message === 'Invalid credentials' ||
            (error as any).response?.data?.error === 'Invalid username or password' ||
            (error as any).response?.data?.message === 'Invalid username or password') {
          throw new Error('Kullanıcı adı veya şifre hatalı');
        } else {
          // Generic 401 error - could be token issues, etc.
          throw new Error(errorMessage || 'Yetkilendirme hatası. Lütfen tekrar deneyin.');
        }
      } else if ((error as any).response?.status === 429) {
        throw new Error('Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin.');
      } else if ((error as any).response?.status >= 500) {
        throw new Error('Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
      } else if ((error as any).code === 'NETWORK_ERROR' || (error as any).message?.includes('Network Error')) {
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
  static async updateProfile(data: { adSoyad?: string; sifre?: string }) {
    return apiClient.post('/api/profile/update', data);
  }

  static async changePassword(data: { currentPassword: string; newPassword: string }) {
    // Şifre gereksinimleri geçici olarak devre dışı
    // const { PasswordPolicy } = await import('./security');
    // const validation = PasswordPolicy.validate(data.newPassword);
    
    // if (!validation.isValid) {
    //   throw new Error(`Şifre gereksinimleri karşılanmıyor: ${validation.errors.join(', ')}`);
    // }

    return apiClient.post('/api/user/change-password', data);
  }

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