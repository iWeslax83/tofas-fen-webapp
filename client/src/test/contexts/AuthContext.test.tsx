import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import AuthProvider, { useAuthContext } from '../../contexts/AuthContext';
import { TokenManager } from '../../utils/security';
import { SecureAPI } from '../../utils/api';
import { AppError } from '../../utils/AppError';

// Mock dependencies
vi.mock('../../utils/security');
vi.mock('../../utils/api');

const mockTokenManager = vi.mocked(TokenManager);
const mockSecureAPI = vi.mocked(SecureAPI);

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('useAuthContext', () => {
    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useAuthContext());
      }).toThrow('AuthContext must be used within AuthProvider');
    });
  });

  describe('AuthProvider', () => {
    it('should provide initial state', async () => {
      mockTokenManager.getAccessToken.mockReturnValue(null);
      mockSecureAPI.getCurrentUser.mockRejectedValue(new Error('No session'));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Wait for async operations to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle successful authentication check', async () => {
      const mockUser = {
        id: 'user123',
        adSoyad: 'John Doe',
        rol: 'student' as const,
        email: 'john@example.com'
      };

      mockTokenManager.getAccessToken.mockReturnValue('valid-token');
      mockTokenManager.isTokenExpired.mockReturnValue(false);
      mockSecureAPI.get.mockResolvedValue({
        data: mockUser
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Wait for async operations
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(result.current.user).toEqual({
        ...mockUser,
        pansiyon: false
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle authentication check failure', async () => {
      mockTokenManager.getAccessToken.mockReturnValue(null);
      mockSecureAPI.getCurrentUser.mockRejectedValue(new Error('API Error'));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Wait for async operations
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle login successfully', async () => {
      const mockLoginResponse = {
        user: {
          id: 'user123',
          adSoyad: 'John Doe',
          rol: 'student' as const,
          email: 'john@example.com'
        }
      };

      mockSecureAPI.login.mockResolvedValue(mockLoginResponse as any);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuthContext(), { wrapper });

      await act(async () => {
        await result.current.login('user123', 'password123');
      });

      expect(result.current.user).toEqual({
        ...mockLoginResponse.user,
        pansiyon: false
      });
      expect(result.current.error).toBeNull();
    });

    it('should handle login failure', async () => {
      const loginError = new AppError('Invalid credentials');
      mockSecureAPI.login.mockRejectedValue(loginError);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuthContext(), { wrapper });

      await act(async () => {
        try {
          await result.current.login('user123', 'wrongpassword');
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeInstanceOf(AppError);
    });

    it('should handle logout', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuthContext(), { wrapper });

      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
    });

    it('should check authentication on mount', async () => {
      mockTokenManager.getAccessToken.mockReturnValue(null);
      mockSecureAPI.getCurrentUser.mockRejectedValue(new Error('No session'));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      renderHook(() => useAuthContext(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // It should call either getAccessToken (fallback check) or getCurrentUser (httpOnly check)
      expect(mockSecureAPI.getCurrentUser).toHaveBeenCalled();
    });
  });
});
