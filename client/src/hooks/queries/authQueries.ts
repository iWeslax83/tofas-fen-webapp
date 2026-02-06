/**
 * Authentication-related React Query hooks
 */

import { useApiQuery, useApiMutation, queryKeys } from '../useReactQuery';
import { SecureAPI } from '../../utils/api';

// Get current user
export function useCurrentUser() {
  return useApiQuery(
    queryKeys.auth.me,
    async () => {
      const response = await SecureAPI.getCurrentUser();
      return response.data as any;
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes for user data
      retry: false, // Don't retry auth failures
    }
  );
}

// Login mutation
export function useLogin() {
  return useApiMutation(
    async (credentials: { id: string; sifre: string }) => {
      const result = await SecureAPI.login('', '', credentials);
      return { success: true, data: result.user } as any;
    },
    {
      invalidateQueries: [[...queryKeys.auth.me]],
      successMessage: 'Giriş başarılı',
      errorMessage: 'Giriş başarısız',
    }
  );
}

// Logout mutation
export function useLogout() {
  return useApiMutation(
    async () => {
      await SecureAPI.logout();
      return { success: true } as any;
    },
    {
      invalidateQueries: [[...queryKeys.auth.me]],
      successMessage: 'Çıkış yapıldı',
    }
  );
}

// Update profile mutation
export function useUpdateProfile() {
  return useApiMutation(
    async (data: { adSoyad?: string; sifre?: string }) => {
      const response = await SecureAPI.updateProfile(data);
      return response.data as any;
    },
    {
      invalidateQueries: [[...queryKeys.auth.me]],
      successMessage: 'Profil güncellendi',
    }
  );
}

// Şifre değiştirme hook'u kaldırıldı - artık TCKN kullanılıyor

