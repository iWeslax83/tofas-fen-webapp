/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOptimisticMutation } from '../useApi';

interface ApiResp<T> {
  success: boolean;
  data: T | null;
  error?: string;
  statusCode?: number;
}
const okResp = <T,>(data: T): ApiResp<T> => ({ success: true, data, statusCode: 200 });
const errResp = (msg?: string): ApiResp<unknown> => ({
  success: false,
  data: null,
  error: msg,
  statusCode: 500,
});

describe('useOptimisticMutation', () => {
  it('initialises in the idle state', () => {
    const apiCall = vi.fn();
    const { result } = renderHook(() => useOptimisticMutation(apiCall));
    expect(result.current.loading).toBe('idle');
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(apiCall).not.toHaveBeenCalled();
  });

  it('calls optimisticUpdate(data) BEFORE the apiCall fires', async () => {
    const order: string[] = [];
    const optimisticUpdate = vi.fn(() => order.push('optimistic'));
    const apiCall = vi.fn(async () => {
      order.push('api');
      return okResp({ id: 7 });
    });

    const { result } = renderHook(() => useOptimisticMutation(apiCall, { optimisticUpdate }));

    await act(async () => {
      await result.current.mutate({ name: 'Ali' });
    });

    expect(optimisticUpdate).toHaveBeenCalledWith({ name: 'Ali' });
    expect(order).toEqual(['optimistic', 'api']);
  });

  it('does NOT call rollbackUpdate on a successful response', async () => {
    const optimisticUpdate = vi.fn();
    const rollbackUpdate = vi.fn();
    const onSuccess = vi.fn();
    const apiCall = vi.fn().mockResolvedValue(okResp({ id: 7 }));

    const { result } = renderHook(() =>
      useOptimisticMutation(apiCall, { optimisticUpdate, rollbackUpdate, onSuccess }),
    );

    await act(async () => {
      await result.current.mutate({});
    });

    expect(optimisticUpdate).toHaveBeenCalledTimes(1);
    expect(rollbackUpdate).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith({ id: 7 });
    expect(result.current.loading).toBe('success');
  });

  it('calls rollbackUpdate when the API returns success=false', async () => {
    const optimisticUpdate = vi.fn();
    const rollbackUpdate = vi.fn();
    const onError = vi.fn();
    const apiCall = vi.fn().mockResolvedValue(errResp('bad'));

    const { result } = renderHook(() =>
      useOptimisticMutation(apiCall, { optimisticUpdate, rollbackUpdate, onError }),
    );

    await act(async () => {
      await result.current.mutate({});
    });

    expect(optimisticUpdate).toHaveBeenCalledTimes(1);
    expect(rollbackUpdate).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith('bad');
    expect(result.current.loading).toBe('error');
    expect(result.current.error).toBe('bad');
  });

  it('falls back to "Mutation failed" when the API omits an error message', async () => {
    const onError = vi.fn();
    const apiCall = vi.fn().mockResolvedValue(errResp());
    const { result } = renderHook(() => useOptimisticMutation(apiCall, { onError }));

    await act(async () => {
      await result.current.mutate({});
    });

    expect(result.current.error).toBe('Mutation failed');
    expect(onError).toHaveBeenCalledWith('Mutation failed');
  });

  it('calls rollbackUpdate AND re-throws when the apiCall promise rejects', async () => {
    const optimisticUpdate = vi.fn();
    const rollbackUpdate = vi.fn();
    const onError = vi.fn();
    const apiCall = vi.fn().mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() =>
      useOptimisticMutation(apiCall, { optimisticUpdate, rollbackUpdate, onError }),
    );

    await act(async () => {
      await expect(result.current.mutate({})).rejects.toThrow('network down');
    });

    expect(optimisticUpdate).toHaveBeenCalledTimes(1);
    expect(rollbackUpdate).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe('network down');
    expect(onError).toHaveBeenCalledWith('network down');
  });

  it('captures "Unknown error occurred" when rejection is not an Error', async () => {
    const apiCall = vi.fn().mockRejectedValue('string rejection');
    const { result } = renderHook(() => useOptimisticMutation(apiCall));

    await act(async () => {
      await expect(result.current.mutate({})).rejects.toBe('string rejection');
    });

    expect(result.current.error).toBe('Unknown error occurred');
  });

  it('mutate() returns the response object on success', async () => {
    const apiCall = vi.fn().mockResolvedValue(okResp({ id: 1 }));
    const { result } = renderHook(() => useOptimisticMutation(apiCall));
    let resp: ApiResp<{ id: number }> | null = null;
    await act(async () => {
      resp = await result.current.mutate({});
    });
    expect(resp).toEqual(okResp({ id: 1 }));
  });

  it('reset() returns the hook to the initial idle state', async () => {
    const apiCall = vi.fn().mockResolvedValue(okResp({ id: 1 }));
    const { result } = renderHook(() => useOptimisticMutation(apiCall));

    await act(async () => {
      await result.current.mutate({});
    });
    expect(result.current.loading).toBe('success');

    act(() => {
      result.current.reset();
    });
    expect(result.current.loading).toBe('idle');
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('works without any callback options (optimisticUpdate / rollback / onSuccess / onError)', async () => {
    const apiCall = vi.fn().mockResolvedValue(okResp({ id: 1 }));
    const { result } = renderHook(() => useOptimisticMutation(apiCall));

    await act(async () => {
      await result.current.mutate({});
    });

    expect(result.current.loading).toBe('success');
    expect(result.current.data).toEqual({ id: 1 });
  });
});
