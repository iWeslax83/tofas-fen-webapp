import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { kullaniciyaGosterilecekHata } from '../utils/errorMessages';

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
        setError(kullaniciyaGosterilecekHata(err, errorMessage));
        return null;
      }
    },
    [setError],
  );

  const handleApiError = useCallback(
    (error: unknown, fallbackMessage?: string) => {
      // Ham sunucu metni yerine kullanıcının anlayacağı cümle.
      setError(kullaniciyaGosterilecekHata(error, fallbackMessage));
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
