import { useState, useCallback } from 'react';
import { LoadingState } from '../@types';

interface UseLoadingStateReturn {
  loading: LoadingState;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isIdle: boolean;
  setLoading: (state: LoadingState) => void;
  startLoading: () => void;
  setSuccess: () => void;
  setError: () => void;
  reset: () => void;
  withLoading: <T>(
    asyncFn: () => Promise<T>,
    errorMessage?: string
  ) => Promise<T | null>;
}

export const useLoadingState = (): UseLoadingStateReturn => {
  const [loading, setLoadingState] = useState<LoadingState>('idle');

  const setLoading = useCallback((state: LoadingState) => {
    setLoadingState(state);
  }, []);

  const startLoading = useCallback(() => {
    setLoadingState('loading');
  }, []);

  const setSuccess = useCallback(() => {
    setLoadingState('success');
  }, []);

  const setError = useCallback(() => {
    setLoadingState('error');
  }, []);

  const reset = useCallback(() => {
    setLoadingState('idle');
  }, []);

  const withLoading = useCallback(async <T>(
    asyncFn: () => Promise<T>,
  ): Promise<T | null> => {
    try {
      startLoading();
      const result = await asyncFn();
      setSuccess();
      return result;
    } catch (error: unknown) {
      setError();
      console.error('Error in withLoading:', error);
      return null;
    }
  }, [startLoading, setSuccess, setError]);

  return {
    loading,
    isLoading: loading === 'loading',
    isSuccess: loading === 'success',
    isError: loading === 'error',
    isIdle: loading === 'idle',
    setLoading,
    startLoading,
    setSuccess,
    setError,
    reset,
    withLoading
  };
};
