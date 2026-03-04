import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useApiQuery, useApiMutation, usePaginatedQuery, queryKeys } from '../useReactQuery';

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('queryKeys', () => {
  it('generates auth keys', () => {
    expect(queryKeys.auth.me).toEqual(['auth', 'me']);
    expect(queryKeys.auth.profile('u1')).toEqual(['auth', 'profile', 'u1']);
  });

  it('generates announcement keys', () => {
    expect(queryKeys.announcements.all).toEqual(['announcements']);
    expect(queryKeys.announcements.list({ type: 'urgent' })).toEqual(['announcements', 'list', { type: 'urgent' }]);
    expect(queryKeys.announcements.detail('a1')).toEqual(['announcements', 'detail', 'a1']);
  });

  it('generates notes keys', () => {
    expect(queryKeys.notes.all).toEqual(['notes']);
    expect(queryKeys.notes.list()).toEqual(['notes', 'list', undefined]);
    expect(queryKeys.notes.detail('n1')).toEqual(['notes', 'detail', 'n1']);
    expect(queryKeys.notes.student('s1')).toEqual(['notes', 'student', 's1']);
    expect(queryKeys.notes.stats()).toEqual(['notes', 'stats', undefined]);
    expect(queryKeys.notes.studentStats('s1')).toEqual(['notes', 'studentStats', 's1']);
  });

  it('generates homework keys', () => {
    expect(queryKeys.homeworks.all).toEqual(['homeworks']);
    expect(queryKeys.homeworks.student('s1')).toEqual(['homeworks', 'student', 's1']);
  });

  it('generates evci request keys', () => {
    expect(queryKeys.evciRequests.all).toEqual(['evci-requests']);
    expect(queryKeys.evciRequests.detail('e1')).toEqual(['evci-requests', 'detail', 'e1']);
  });

  it('generates dormitory keys', () => {
    expect(queryKeys.dormitory.meals('2024-01-01')).toEqual(['dormitory', 'meals', '2024-01-01']);
    expect(queryKeys.dormitory.supervisors).toEqual(['dormitory', 'supervisors']);
  });

  it('generates schedule keys', () => {
    expect(queryKeys.schedule.class('c1')).toEqual(['schedule', 'class', 'c1']);
    expect(queryKeys.schedule.teacher('t1')).toEqual(['schedule', 'teacher', 't1']);
  });

  it('generates analytics keys', () => {
    expect(queryKeys.analytics.dashboard('admin')).toEqual(['analytics', 'dashboard', 'admin']);
  });
});

describe('useApiQuery', () => {
  it('returns data on success', async () => {
    const queryFn = vi.fn().mockResolvedValue({ success: true, data: [1, 2, 3] });
    const { result } = renderHook(
      () => useApiQuery(['test-key'], queryFn),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ success: true, data: [1, 2, 3] });
  });

  it('throws on unsuccessful response', async () => {
    const queryFn = vi.fn().mockResolvedValue({ success: false, error: '404 Not Found' });
    const { result } = renderHook(
      () => useApiQuery(['test-fail'], queryFn),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('404 Not Found');
  });

  it('uses default error message when none provided', async () => {
    const queryFn = vi.fn().mockResolvedValue({ success: false, error: '400 Bad Request' });
    const { result } = renderHook(
      () => useApiQuery(['test-default-err'], queryFn),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('respects enabled option', async () => {
    const queryFn = vi.fn().mockResolvedValue({ success: true, data: [] });
    renderHook(
      () => useApiQuery(['test-disabled'], queryFn, { enabled: false }),
      { wrapper: createWrapper() }
    );
    expect(queryFn).not.toHaveBeenCalled();
  });
});

describe('useApiMutation', () => {
  it('calls mutation function and invalidates queries', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ success: true, message: 'Done' });
    const { result } = renderHook(
      () => useApiMutation(mutationFn, { invalidateQueries: [['test']] }),
      { wrapper: createWrapper() }
    );
    result.current.mutate('arg1' as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mutationFn).toHaveBeenCalledWith('arg1');
  });

  it('throws on unsuccessful mutation', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ success: false, error: 'Mutation failed' });
    const { result } = renderHook(
      () => useApiMutation(mutationFn),
      { wrapper: createWrapper() }
    );
    result.current.mutate('arg' as any);
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('usePaginatedQuery', () => {
  it('passes page and limit to query function', async () => {
    const queryFn = vi.fn().mockResolvedValue({ success: true, data: [], pagination: { page: 2, limit: 10 } });
    const { result } = renderHook(
      () => usePaginatedQuery(['paginated-test'], queryFn, { initialPage: 2, initialLimit: 10 }),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryFn).toHaveBeenCalledWith(2, 10);
  });

  it('uses defaults (page 1, limit 20)', async () => {
    const queryFn = vi.fn().mockResolvedValue({ success: true, data: [] });
    renderHook(
      () => usePaginatedQuery(['paginated-default'], queryFn),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(queryFn).toHaveBeenCalledWith(1, 20));
  });
});
