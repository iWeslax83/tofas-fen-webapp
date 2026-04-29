/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useApi } from '../useApi';

interface ApiResp<T> {
  success: boolean;
  data: T | null;
  error?: string;
  statusCode?: number;
}

const okResp = <T,>(data: T): ApiResp<T> => ({ success: true, data, statusCode: 200 });
const errResp = (msg: string): ApiResp<unknown> => ({
  success: false,
  data: null,
  error: msg,
  statusCode: 500,
});

describe('useApi', () => {
  it('initialises in the idle state with no data or error', () => {
    const apiCall = vi.fn();
    const { result } = renderHook(() => useApi(apiCall));
    expect(result.current.loading).toBe('idle');
    expect(result.current.isIdle).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(apiCall).not.toHaveBeenCalled();
  });

  it('transitions idle → loading → success on a happy-path execute', async () => {
    const apiCall = vi.fn().mockResolvedValue(okResp({ id: 1, name: 'Ali' }));
    const { result } = renderHook(() => useApi(apiCall));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.loading).toBe('success');
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toEqual({ id: 1, name: 'Ali' });
    expect(result.current.error).toBeNull();
    expect(apiCall).toHaveBeenCalledTimes(1);
  });

  it('transitions to error state when the API returns success=false', async () => {
    const apiCall = vi.fn().mockResolvedValue(errResp('Server boom'));
    const { result } = renderHook(() => useApi(apiCall));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.loading).toBe('error');
    expect(result.current.isError).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Server boom');
  });

  it('falls back to "API request failed" when error string is missing', async () => {
    const apiCall = vi.fn().mockResolvedValue({ success: false, data: null, statusCode: 500 });
    const { result } = renderHook(() => useApi(apiCall));
    await act(async () => {
      await result.current.execute();
    });
    expect(result.current.error).toBe('API request failed');
  });

  it('captures Error.message when the apiCall promise rejects', async () => {
    const apiCall = vi.fn().mockRejectedValue(new Error('network fail'));
    const { result } = renderHook(() => useApi(apiCall));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.loading).toBe('error');
    expect(result.current.error).toBe('network fail');
    expect(result.current.data).toBeNull();
  });

  it('captures "Unknown error occurred" when the rejection is a non-Error', async () => {
    const apiCall = vi.fn().mockRejectedValue('string rejection');
    const { result } = renderHook(() => useApi(apiCall));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.error).toBe('Unknown error occurred');
  });

  it('reset() returns the hook to the initial idle state', async () => {
    const apiCall = vi.fn().mockResolvedValue(okResp({ id: 1 }));
    const { result } = renderHook(() => useApi(apiCall));

    await act(async () => {
      await result.current.execute();
    });
    expect(result.current.isSuccess).toBe(true);

    act(() => {
      result.current.reset();
    });
    expect(result.current.loading).toBe('idle');
    expect(result.current.isIdle).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('cancel() clears the abort controller without throwing', () => {
    const apiCall = vi.fn();
    const { result } = renderHook(() => useApi(apiCall));
    expect(() => act(() => result.current.cancel())).not.toThrow();
  });

  it('execute() returns the response on success', async () => {
    const apiCall = vi.fn().mockResolvedValue(okResp({ id: 7 }));
    const { result } = renderHook(() => useApi(apiCall));
    let resp: ApiResp<{ id: number }> | null = null;
    await act(async () => {
      resp = await result.current.execute();
    });
    expect(resp).toEqual(okResp({ id: 7 }));
  });

  it('execute() returns null on rejection', async () => {
    const apiCall = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useApi(apiCall));
    let resp: unknown;
    await act(async () => {
      resp = await result.current.execute();
    });
    expect(resp).toBeNull();
  });

  it('autoExecute=true triggers the call on mount', async () => {
    const apiCall = vi.fn().mockResolvedValue(okResp({ id: 1 }));
    renderHook(() => useApi(apiCall, { autoExecute: true }));
    await waitFor(() => expect(apiCall).toHaveBeenCalledTimes(1));
  });

  it('autoExecute=false (default) does NOT call the api on mount', () => {
    const apiCall = vi.fn().mockResolvedValue(okResp({ id: 1 }));
    renderHook(() => useApi(apiCall));
    expect(apiCall).not.toHaveBeenCalled();
  });
});
