import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface ErrorState {
  error: string | null;
  hasError: boolean;
}

interface UseErrorHandlerReturn extends ErrorState {
  setError: (error: string | Error | null) => void;
  clearError: () => void;
  handleAsyncError: <T>(asyncFn: () => Promise<T>, errorMessage?: string) => Promise<T | null>;
  handleApiError: (error: unknown, fallbackMessage?: string) => void;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [error, setErrorState] = useState<string | null>(null);

  const setError = useCallback((error: string | Error | null) => {
    if (error === null) {
      setErrorState(null);
      return;
    }

    const errorMessage = typeof error === 'string' ? error : error.message;
    setErrorState(errorMessage);

    // Show toast notification for errors
    toast.error(errorMessage);
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const handleAsyncError = useCallback(
    async <T>(asyncFn: () => Promise<T>, errorMessage?: string): Promise<T | null> => {
      try {
        return await asyncFn();
      } catch (err: unknown) {
        const message = errorMessage || (err instanceof Error ? err.message : 'Bir hata oluştu');
        setError(message);
        return null;
      }
    },
    [setError],
  );

  const handleApiError = useCallback(
    (error: unknown, fallbackMessage?: string) => {
      let message = fallbackMessage || 'Bir hata oluştu';

      const errObj =
        typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : null;
      const resp = errObj?.['response'] as Record<string, unknown> | undefined;
      const respData = resp?.['data'] as Record<string, unknown> | undefined;

      if (typeof respData?.['error'] === 'string') {
        message = respData['error'];
      } else if (typeof respData?.['message'] === 'string') {
        message = respData['message'];
      } else if (error instanceof Error) {
        message = error.message;
      }

      setError(message);
    },
    [setError],
  );

  return {
    error,
    hasError: !!error,
    setError,
    clearError,
    handleAsyncError,
    handleApiError,
  };
};
