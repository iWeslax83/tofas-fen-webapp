import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../../stores/authStore';
import { AppError, ErrorSeverity } from '../../utils/AppError';

// Mock dependencies
vi.mock('../../utils/api', () => ({
  SecureAPI: {
    login: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    getCurrentUser: vi.fn()
  }
}));

vi.mock('../../utils/security', () => ({
  TokenManager: {
    getAccessToken: vi.fn().mockReturnValue(null),
    isTokenExpired: vi.fn().mockReturnValue(false),
    clearTokens: vi.fn()
  }
}));

describe('AuthStore', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Reset store state
    useAuthStore.setState({
      user: null,
      isLoading: false,
      error: null,
      isAuthenticated: false
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const mockUser = {
        id: 'user123',
        adSoyad: 'John Doe',
        rol: 'student',
        email: 'john@example.com'
      };

      const mockResponse = {
        user: mockUser,
        accessToken: 'accessToken123',
        refreshToken: 'refreshToken123'
      };

      const { SecureAPI } = await import('../../utils/api');
      (SecureAPI.login as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('user123', 'password123');
      });

      expect(result.current.user).toEqual({
        id: 'user123',
        adSoyad: 'John Doe',
        rol: 'student',
        email: 'john@example.com',
        emailVerified: false,
        twoFactorEnabled: false,
        pansiyon: false
      });
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle login error', async () => {
      const mockError = new AppError('Invalid credentials', 'AUTHENTICATION_ERROR', ErrorSeverity.HIGH);
      
      const { SecureAPI } = await import('../../utils/api');
      (SecureAPI.login as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.login('user123', 'wrongpassword');
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeInstanceOf(AppError);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle invalid user data', async () => {
      const mockResponse = {
        user: null, // Invalid user data
        accessToken: 'accessToken123',
        refreshToken: 'refreshToken123'
      };

      const { SecureAPI } = await import('../../utils/api');
      (SecureAPI.login as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.login('user123', 'password123');
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeInstanceOf(AppError);
    });
  });

  describe('logout', () => {
    it('should logout user successfully', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set initial state
      act(() => {
        useAuthStore.setState({
          user: { id: 'user123', adSoyad: 'John Doe', rol: 'student' },
          isAuthenticated: true
        });
      });

      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('checkAuth', () => {
    it('should fetch user via httpOnly cookie session', async () => {
      const mockUser = {
        id: 'user123',
        adSoyad: 'John Doe',
        rol: 'student',
        email: 'john@example.com',
        emailVerified: false
      };

      const { SecureAPI } = await import('../../utils/api');
      (SecureAPI.getCurrentUser as any).mockResolvedValue({ data: mockUser });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuth();
      });

      expect(SecureAPI.getCurrentUser).toHaveBeenCalled();
      expect(result.current.user).toEqual({
        ...mockUser,
        twoFactorEnabled: false,
        pansiyon: false
      });
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should clear state when httpOnly session is invalid', async () => {
      const { SecureAPI } = await import('../../utils/api');
      (SecureAPI.getCurrentUser as any).mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuth();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should authenticate when server returns valid user data', async () => {
      const mockUser = {
        id: 'user123',
        adSoyad: 'John Doe',
        rol: 'student',
        email: 'john@example.com'
      };

      const { SecureAPI } = await import('../../utils/api');
      (SecureAPI.getCurrentUser as any).mockResolvedValue({ data: mockUser });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuth();
      });

      expect(SecureAPI.getCurrentUser).toHaveBeenCalled();
      expect(result.current.user).toEqual({
        id: 'user123',
        adSoyad: 'John Doe',
        rol: 'student',
        email: 'john@example.com',
        emailVerified: false,
        twoFactorEnabled: false,
        pansiyon: false
      });
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set error state
      act(() => {
        useAuthStore.setState({
          error: 'Test error'
        });
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('updateUser', () => {
    it('should update user data', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set initial user
      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user123',
            adSoyad: 'John Doe',
            rol: 'student',
            email: 'john@example.com'
          }
        });
      });

      act(() => {
        result.current.updateUser({
          adSoyad: 'John Smith',
          email: 'johnsmith@example.com'
        });
      });

      expect(result.current.user).toEqual({
        id: 'user123',
        adSoyad: 'John Smith',
        rol: 'student',
        email: 'johnsmith@example.com'
      });
    });

    it('should not update user when no user is set', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.updateUser({
          adSoyad: 'John Smith'
        });
      });

      expect(result.current.user).toBeNull();
    });
  });
});
