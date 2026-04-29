/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePaginatedApi } from '../useApi';

interface PaginatedResp<T> {
  success: boolean;
  data: T[] | null;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
  statusCode?: number;
}

const buildOk = <T,>(
  data: T[],
  pageInfo: { page: number; limit: number; total: number },
): PaginatedResp<T> => ({
  success: true,
  data,
  pagination: {
    ...pageInfo,
    totalPages: Math.ceil(pageInfo.total / pageInfo.limit),
  },
  statusCode: 200,
});

describe('usePaginatedApi', () => {
  it('initialises with idle state and the supplied initial page / limit', () => {
    const apiCall = vi.fn();
    const { result } = renderHook(() =>
      usePaginatedApi(apiCall, { initialPage: 2, initialLimit: 25 }),
    );
    expect(result.current.page).toBe(2);
    expect(result.current.limit).toBe(25);
    expect(result.current.loading).toBe('idle');
    expect(result.current.data).toBeNull();
    expect(result.current.pagination.total).toBe(0);
  });

  it('defaults to page=1 / limit=10 when no options are provided', () => {
    const { result } = renderHook(() => usePaginatedApi(vi.fn()));
    expect(result.current.page).toBe(1);
    expect(result.current.limit).toBe(10);
  });

  it('execute() loads data + pagination flags on success', async () => {
    const apiCall = vi
      .fn()
      .mockResolvedValue(buildOk([{ id: 1 }, { id: 2 }], { page: 1, limit: 10, total: 25 }));
    const { result } = renderHook(() => usePaginatedApi(apiCall));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.current.loading).toBe('success');
    expect(result.current.pagination.total).toBe(25);
    expect(result.current.pagination.totalPages).toBe(3);
    expect(result.current.pagination.hasNextPage).toBe(true);
    expect(result.current.pagination.hasPrevPage).toBe(false);
  });

  it('reflects hasPrevPage / hasNextPage correctly on a middle page', async () => {
    const apiCall = vi
      .fn()
      .mockResolvedValue(buildOk([{ id: 1 }], { page: 2, limit: 10, total: 25 }));
    const { result } = renderHook(() => usePaginatedApi(apiCall, { initialPage: 2 }));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.pagination.hasPrevPage).toBe(true);
    expect(result.current.pagination.hasNextPage).toBe(true);
  });

  it('reflects hasNextPage=false on the last page', async () => {
    const apiCall = vi
      .fn()
      .mockResolvedValue(buildOk([{ id: 1 }], { page: 3, limit: 10, total: 25 }));
    const { result } = renderHook(() => usePaginatedApi(apiCall, { initialPage: 3 }));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.pagination.hasNextPage).toBe(false);
    expect(result.current.pagination.hasPrevPage).toBe(true);
  });

  it('goToPage(N) updates page state AND triggers execute', async () => {
    const apiCall = vi
      .fn()
      .mockResolvedValue(buildOk([{ id: 1 }], { page: 1, limit: 10, total: 25 }));
    const { result } = renderHook(() => usePaginatedApi(apiCall));

    await act(async () => {
      await result.current.goToPage(2);
    });

    expect(result.current.page).toBe(2);
    expect(apiCall).toHaveBeenCalledWith(2, 10);
  });

  it('changeLimit(N) resets page to 1 and triggers execute with the new limit', async () => {
    const apiCall = vi
      .fn()
      .mockResolvedValue(buildOk([{ id: 1 }], { page: 1, limit: 50, total: 25 }));
    const { result } = renderHook(() => usePaginatedApi(apiCall, { initialPage: 3 }));

    await act(async () => {
      await result.current.changeLimit(50);
    });

    expect(result.current.page).toBe(1);
    expect(result.current.limit).toBe(50);
    expect(apiCall).toHaveBeenCalledWith(1, 50);
  });

  it('reset() returns page / limit / state to initial values', async () => {
    const apiCall = vi
      .fn()
      .mockResolvedValue(buildOk([{ id: 1 }], { page: 1, limit: 10, total: 25 }));
    const { result } = renderHook(() =>
      usePaginatedApi(apiCall, { initialPage: 1, initialLimit: 10 }),
    );

    await act(async () => {
      await result.current.execute();
    });
    expect(result.current.loading).toBe('success');

    await act(async () => {
      await result.current.goToPage(2);
    });
    expect(result.current.page).toBe(2);

    act(() => {
      result.current.reset();
    });

    expect(result.current.page).toBe(1);
    expect(result.current.limit).toBe(10);
    expect(result.current.loading).toBe('idle');
    expect(result.current.data).toBeNull();
    expect(result.current.pagination.total).toBe(0);
  });

  it('captures the API error string in error state', async () => {
    const apiCall = vi.fn().mockResolvedValue({
      success: false,
      data: null,
      error: 'fail',
      statusCode: 500,
    });
    const { result } = renderHook(() => usePaginatedApi(apiCall));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.loading).toBe('error');
    expect(result.current.error).toBe('fail');
  });

  it('captures Error.message on rejection and re-throws', async () => {
    const apiCall = vi.fn().mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => usePaginatedApi(apiCall));

    await act(async () => {
      await expect(result.current.execute()).rejects.toThrow('network');
    });

    expect(result.current.loading).toBe('error');
    expect(result.current.error).toBe('network');
  });

  it('autoExecute=true triggers the api call on mount', async () => {
    const apiCall = vi.fn().mockResolvedValue(buildOk([], { page: 1, limit: 10, total: 0 }));
    renderHook(() => usePaginatedApi(apiCall, { autoExecute: true }));
    await waitFor(() => expect(apiCall).toHaveBeenCalled());
  });
});
