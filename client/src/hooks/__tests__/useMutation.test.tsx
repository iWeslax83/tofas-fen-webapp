/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMutation } from '../useApi';

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

describe('useMutation', () => {
  it('initialises in the idle state', () => {
    const apiCall = vi.fn();
    const { result } = renderHook(() => useMutation(apiCall));
    expect(result.current.loading).toBe('idle');
    expect(result.current.isIdle).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(apiCall).not.toHaveBeenCalled();
  });

  it('mutate(payload) transitions idle → loading → success on a happy path', async () => {
    const apiCall = vi.fn().mockResolvedValue(okResp({ id: 7 }));
    const { result } = renderHook(() => useMutation(apiCall));

    await act(async () => {
      await result.current.mutate({ name: 'Ali' });
    });

    expect(apiCall).toHaveBeenCalledWith({ name: 'Ali' });
    expect(result.current.loading).toBe('success');
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toEqual({ id: 7 });
    expect(result.current.error).toBeNull();
  });

  it('fires onSuccess(data) when the API succeeds', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onSettled = vi.fn();
    const apiCall = vi.fn().mockResolvedValue(okResp({ id: 7 }));

    const { result } = renderHook(() => useMutation(apiCall, { onSuccess, onError, onSettled }));

    await act(async () => {
      await result.current.mutate({});
    });

    expect(onSuccess).toHaveBeenCalledWith({ id: 7 });
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('fires onError(message) when success=false', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onSettled = vi.fn();
    const apiCall = vi.fn().mockResolvedValue(errResp('bad input'));

    const { result } = renderHook(() => useMutation(apiCall, { onSuccess, onError, onSettled }));

    await act(async () => {
      await result.current.mutate({});
    });

    expect(result.current.loading).toBe('error');
    expect(result.current.error).toBe('bad input');
    expect(onError).toHaveBeenCalledWith('bad input');
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('falls back to "Mutation failed" when the API omits an error message', async () => {
    const onError = vi.fn();
    const apiCall = vi.fn().mockResolvedValue(errResp());
    const { result } = renderHook(() => useMutation(apiCall, { onError }));

    await act(async () => {
      await result.current.mutate({});
    });

    expect(result.current.error).toBe('Mutation failed');
    expect(onError).toHaveBeenCalledWith('Mutation failed');
  });

  it('captures Error.message on rejection, fires onError + onSettled, and re-throws', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onSettled = vi.fn();
    const apiCall = vi.fn().mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useMutation(apiCall, { onSuccess, onError, onSettled }));

    await act(async () => {
      await expect(result.current.mutate({})).rejects.toThrow('network down');
    });

    expect(result.current.loading).toBe('error');
    expect(result.current.error).toBe('network down');
    expect(onError).toHaveBeenCalledWith('network down');
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('captures "Unknown error occurred" when rejection is not an Error', async () => {
    const apiCall = vi.fn().mockRejectedValue('string rejection');
    const { result } = renderHook(() => useMutation(apiCall));

    await act(async () => {
      await expect(result.current.mutate({})).rejects.toBe('string rejection');
    });

    expect(result.current.error).toBe('Unknown error occurred');
  });

  it('mutate() returns the response object on success', async () => {
    const apiCall = vi.fn().mockResolvedValue(okResp({ id: 1 }));
    const { result } = renderHook(() => useMutation(apiCall));
    let resp: ApiResp<{ id: number }> | null = null;
    await act(async () => {
      resp = await result.current.mutate({});
    });
    expect(resp).toEqual(okResp({ id: 1 }));
  });

  it('reset() returns the hook to the initial idle state', async () => {
    const apiCall = vi.fn().mockResolvedValue(okResp({ id: 1 }));
    const { result } = renderHook(() => useMutation(apiCall));

    await act(async () => {
      await result.current.mutate({});
    });
    expect(result.current.isSuccess).toBe(true);

    act(() => {
      result.current.reset();
    });
    expect(result.current.loading).toBe('idle');
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('onSettled fires on both success and error paths', async () => {
    const onSettled = vi.fn();

    const apiOk = vi.fn().mockResolvedValue(okResp({ x: 1 }));
    const okHook = renderHook(() => useMutation(apiOk, { onSettled }));
    await act(async () => {
      await okHook.result.current.mutate({});
    });

    const apiErr = vi.fn().mockResolvedValue(errResp('oops'));
    const errHook = renderHook(() => useMutation(apiErr, { onSettled }));
    await act(async () => {
      await errHook.result.current.mutate({});
    });

    expect(onSettled).toHaveBeenCalledTimes(2);
  });
});
