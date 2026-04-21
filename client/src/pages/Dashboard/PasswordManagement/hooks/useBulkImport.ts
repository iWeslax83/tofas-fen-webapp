import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PasswordAdminService } from '../../../../utils/passwordAdminService';

export function useBulkImportPreview() {
  return useMutation({
    mutationFn: (file: File) => PasswordAdminService.previewBulkImport(file),
  });
}

export function useBulkImportCommit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => PasswordAdminService.runBulkImport(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['passwordAdmin', 'pendingBatches'] }),
  });
}

export function usePendingBatches() {
  return useQuery({
    queryKey: ['passwordAdmin', 'pendingBatches'],
    queryFn: () => PasswordAdminService.listPendingBatches(),
  });
}

export function useActivateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => PasswordAdminService.activateBatch(batchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['passwordAdmin', 'pendingBatches'] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useRegenerateBatch() {
  return useMutation({
    mutationFn: (batchId: string) => PasswordAdminService.regenerateBatch(batchId),
  });
}

export function useCancelBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => PasswordAdminService.cancelBatch(batchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['passwordAdmin', 'pendingBatches'] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
