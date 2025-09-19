import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import AuthProvider, { useAuthContext } from '../../contexts/AuthContext';
import { TokenManager } from '../../utils/security';
import { SecureAPI } from '../../utils/api';
import { UserService } from '../../utils/apiService';

// Mock dependencies
vi.mock('../../utils/security');
vi.mock('../../utils/api');
vi.mock('../../utils/apiService');

const mockTokenManager = vi.mocked(TokenManager);
const mockSecureAPI = vi.mocked(SecureAPI);
const mockUserService = vi.mocked(UserService);

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
      mockTokenManager.isTokenExpired.mockReturnValue(true);

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
      mockUserService.getCurrentUser.mockResolvedValue({
        data: mockUser,
        error: null
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Wait for async operations
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle authentication check failure', async () => {
      mockTokenManager.getAccessToken.mockReturnValue('valid-token');
      mockTokenManager.isTokenExpired.mockReturnValue(false);
      mockUserService.getCurrentUser.mockRejectedValue(new Error('API Error'));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuthContext(), { wrapper });

      // Wait for async operations
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('should handle login successfully', async () => {
      const mockLoginResponse = {
        user: {
          id: 'user123',
          adSoyad: 'John Doe',
          rol: 'student' as const,
          email: 'john@example.com'
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        refreshExpiresIn: 604800
      };

      mockSecureAPI.login.mockResolvedValue(mockLoginResponse);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuthContext(), { wrapper });

      await act(async () => {
        await result.current.login('user123', 'password123');
      });

      expect(result.current.user).toEqual(mockLoginResponse.user);
      expect(result.current.error).toBeNull();
    });

    it('should handle login failure', async () => {
      const loginError = new Error('Invalid credentials');
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

      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('should handle logout', () => {
      mockTokenManager.clearTokens.mockImplementation(() => {});

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuthContext(), { wrapper });

      act(() => {
        result.current.logout();
      });

      expect(mockTokenManager.clearTokens).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });

    it('should check authentication on mount', async () => {
      mockTokenManager.getAccessToken.mockReturnValue(null);
      mockTokenManager.isTokenExpired.mockReturnValue(true);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuthContext(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockTokenManager.getAccessToken).toHaveBeenCalled();
      expect(mockTokenManager.isTokenExpired).toHaveBeenCalled();
    });
  });
});
