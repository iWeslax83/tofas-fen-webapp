import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PasswordAdminService } from '../../../../utils/passwordAdminService';

export function useResetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { userId: string; reason: string; reasonNote?: string }) =>
      PasswordAdminService.resetPassword(p.userId, p.reason, p.reasonNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['passwordAdmin', 'audit'] });
    },
  });
}

export function useGeneratePassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { userId: string; reason?: string; reasonNote?: string }) =>
      PasswordAdminService.generatePassword(p.userId, p.reason, p.reasonNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['passwordAdmin', 'audit'] });
    },
  });
}
