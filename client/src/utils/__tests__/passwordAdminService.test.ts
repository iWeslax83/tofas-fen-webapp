import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../api', () => ({
  apiClient: {
    get: mocks.get,
    post: mocks.post,
    delete: mocks.delete,
  },
}));

import { PasswordAdminService } from '../passwordAdminService';
import { PASSWORD_ADMIN_ENDPOINTS } from '../apiEndpoints';

describe('PasswordAdminService', () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
    mocks.delete.mockReset();
  });

  it('previewBulkImport posts the file as multipart and returns the data', async () => {
    const file = new File(['csv'], 'users.csv');
    const payload = {
      total: 3,
      warnings: ['x'],
      existingIds: [],
      sample: [],
      classDistribution: {},
    };
    mocks.post.mockResolvedValueOnce({ data: payload });

    const result = await PasswordAdminService.previewBulkImport(file);

    expect(result).toEqual(payload);
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post.mock.calls[0][0]).toBe(PASSWORD_ADMIN_ENDPOINTS.BULK_IMPORT_PREVIEW);
    const fd = mocks.post.mock.calls[0][1] as FormData;
    expect(fd).toBeInstanceOf(FormData);
    expect(fd.get('file')).toBe(file);
    expect(mocks.post.mock.calls[0][2]).toEqual({
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  });

  it('runBulkImport posts to BULK_IMPORT', async () => {
    const file = new File(['csv'], 'users.csv');
    mocks.post.mockResolvedValueOnce({ data: { batchId: 'b' } });
    const result = await PasswordAdminService.runBulkImport(file);
    expect(result).toEqual({ batchId: 'b' });
    expect(mocks.post.mock.calls[0][0]).toBe(PASSWORD_ADMIN_ENDPOINTS.BULK_IMPORT);
  });

  it('activateBatch posts the batchId to ACTIVATE_BATCH', async () => {
    mocks.post.mockResolvedValueOnce({ data: { activated: 5 } });
    const result = await PasswordAdminService.activateBatch('b-123');
    expect(result).toEqual({ activated: 5 });
    expect(mocks.post.mock.calls[0][0]).toBe(PASSWORD_ADMIN_ENDPOINTS.ACTIVATE_BATCH);
    expect(mocks.post.mock.calls[0][1]).toEqual({ batchId: 'b-123' });
  });

  it('regenerateBatch posts to REGENERATE_BATCH(id)', async () => {
    mocks.post.mockResolvedValueOnce({ data: { batchId: 'b-2' } });
    const result = await PasswordAdminService.regenerateBatch('b-1');
    expect(result).toEqual({ batchId: 'b-2' });
    expect(mocks.post.mock.calls[0][0]).toBe(PASSWORD_ADMIN_ENDPOINTS.REGENERATE_BATCH('b-1'));
  });

  it('cancelBatch deletes CANCEL_BATCH(id)', async () => {
    mocks.delete.mockResolvedValueOnce({ data: { cancelled: 3 } });
    const result = await PasswordAdminService.cancelBatch('b-1');
    expect(result).toEqual({ cancelled: 3 });
    expect(mocks.delete.mock.calls[0][0]).toBe(PASSWORD_ADMIN_ENDPOINTS.CANCEL_BATCH('b-1'));
  });

  it('listPendingBatches gets PENDING_BATCHES and returns the .items array', async () => {
    mocks.get.mockResolvedValueOnce({
      data: { items: [{ batchId: 'a' }, { batchId: 'b' }] },
    });
    const result = await PasswordAdminService.listPendingBatches();
    expect(result).toEqual([{ batchId: 'a' }, { batchId: 'b' }]);
    expect(mocks.get.mock.calls[0][0]).toBe(PASSWORD_ADMIN_ENDPOINTS.PENDING_BATCHES);
  });

  it('resetPassword posts reason + reasonNote to RESET(userId)', async () => {
    mocks.post.mockResolvedValueOnce({ data: { password: 'x', userId: 'u-1' } });
    const result = await PasswordAdminService.resetPassword('u-1', 'forgot', 'note');
    expect(result).toEqual({ password: 'x', userId: 'u-1' });
    expect(mocks.post.mock.calls[0][0]).toBe(PASSWORD_ADMIN_ENDPOINTS.RESET('u-1'));
    expect(mocks.post.mock.calls[0][1]).toEqual({ reason: 'forgot', reasonNote: 'note' });
  });

  it('resetPassword omits reasonNote when not supplied', async () => {
    mocks.post.mockResolvedValueOnce({ data: {} });
    await PasswordAdminService.resetPassword('u-1', 'forgot');
    expect(mocks.post.mock.calls[0][1]).toEqual({ reason: 'forgot', reasonNote: undefined });
  });

  it('generatePassword defaults reason to "new_user"', async () => {
    mocks.post.mockResolvedValueOnce({ data: {} });
    await PasswordAdminService.generatePassword('u-2');
    expect(mocks.post.mock.calls[0][0]).toBe(PASSWORD_ADMIN_ENDPOINTS.GENERATE('u-2'));
    expect(mocks.post.mock.calls[0][1]).toEqual({ reason: 'new_user', reasonNote: undefined });
  });

  it('generatePassword honours an explicit reason + note', async () => {
    mocks.post.mockResolvedValueOnce({ data: {} });
    await PasswordAdminService.generatePassword('u-2', 'manual_reset', 'because');
    expect(mocks.post.mock.calls[0][1]).toEqual({
      reason: 'manual_reset',
      reasonNote: 'because',
    });
  });

  it('auditLog gets AUDIT with params object as query', async () => {
    const items = [{ _id: 'x', userId: 'u' }];
    mocks.get.mockResolvedValueOnce({
      data: { items, total: 1, page: 1, limit: 10 },
    });
    const result = await PasswordAdminService.auditLog({ page: 2, action: 'admin_reset' });
    expect(result.items).toEqual(items);
    expect(mocks.get.mock.calls[0][0]).toBe(PASSWORD_ADMIN_ENDPOINTS.AUDIT);
    expect(mocks.get.mock.calls[0][1]).toEqual({ params: { page: 2, action: 'admin_reset' } });
  });
});
