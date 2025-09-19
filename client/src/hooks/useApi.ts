import React, { useState, useCallback, useRef } from 'react';
import { ApiResponse, PaginatedResponse, AsyncState } from '../@types';

// Hook for single API calls
export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  options: {
    autoExecute?: boolean;
    retryCount?: number;
    retryDelay?: number;
  } = {}
) {
  const { autoExecute = false } = options;
  
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: 'idle',
    error: null,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (): Promise<ApiResponse<T> | null> => {
    // Cancel previous request if it's still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, loading: 'loading', error: null }));

    try {
      const response = await apiCall();

      if (abortControllerRef.current?.signal.aborted) {
        return null; // Request was cancelled
      }

      if (response.success && response.data) {
        setState({
          data: response.data,
          loading: 'success',
          error: null,
        });
      } else {
        setState({
          data: null,
          loading: 'error',
          error: response.error || 'API request failed',
        });
      }

      return response;
    } catch (error) {
      if (abortControllerRef.current?.signal.aborted) {
        return null; // Request was cancelled
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      setState({
        data: null,
        loading: 'error',
        error: errorMessage,
      });

      throw error;
    }
  }, [apiCall]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: 'idle',
      error: null,
    });
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Auto-execute on mount if enabled
  React.useEffect(() => {
    if (autoExecute) {
      execute();
    }

    return () => {
      // Cleanup on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoExecute, execute]);

  return {
    ...state,
    execute,
    reset,
    cancel,
    isIdle: state.loading === 'idle',
    isLoading: state.loading === 'loading',
    isSuccess: state.loading === 'success',
    isError: state.loading === 'error',
  };
}

// Hook for paginated API calls
export function usePaginatedApi<T>(
  apiCall: (page: number, limit: number) => Promise<PaginatedResponse<T>>,
  options: {
    initialPage?: number;
    initialLimit?: number;
    autoExecute?: boolean;
  } = {}
) {
  const { initialPage = 1, initialLimit = 10, autoExecute = false } = options;
  
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [state, setState] = useState<AsyncState<T[]>>({
    data: null,
    loading: 'idle',
    error: null,
  });
  
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const execute = useCallback(async (pageNum: number = page, limitNum: number = limit) => {
    setState(prev => ({ ...prev, loading: 'loading', error: null }));

    try {
      const response = await apiCall(pageNum, limitNum);

      if (response.success && response.data) {
        setState({
          data: response.data,
          loading: 'success',
          error: null,
        });

        if (response.pagination) {
          setPagination({
            total: response.pagination.total,
            totalPages: response.pagination.totalPages,
            hasNextPage: pageNum < response.pagination.totalPages,
            hasPrevPage: pageNum > 1,
          });
        }
      } else {
        setState({
          data: null,
          loading: 'error',
          error: response.error || 'API request failed',
        });
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      setState({
        data: null,
        loading: 'error',
        error: errorMessage,
      });

      throw error;
    }
  }, [apiCall, page, limit]);

  const goToPage = useCallback((pageNum: number) => {
    setPage(pageNum);
    execute(pageNum, limit);
  }, [execute, limit]);

  const changeLimit = useCallback((limitNum: number) => {
    setLimit(limitNum);
    setPage(1); // Reset to first page when changing limit
    execute(1, limitNum);
  }, [execute]);

  const nextPage = useCallback(() => {
    if (pagination.hasNextPage) {
      goToPage(page + 1);
    }
  }, [goToPage, page, pagination.hasNextPage]);

  const prevPage = useCallback(() => {
    if (pagination.hasPrevPage) {
      goToPage(page - 1);
    }
  }, [goToPage, page, pagination.hasPrevPage]);

  const reset = useCallback(() => {
    setPage(initialPage);
    setLimit(initialLimit);
    setState({
      data: null,
      loading: 'idle',
      error: null,
    });
    setPagination({
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    });
  }, [initialPage, initialLimit]);

  // Auto-execute on mount if enabled
  React.useEffect(() => {
    if (autoExecute) {
      execute();
    }
  }, [autoExecute, execute]);

  return {
    ...state,
    page,
    limit,
    pagination,
    execute,
    goToPage,
    changeLimit,
    nextPage,
    prevPage,
    reset,
    isIdle: state.loading === 'idle',
    isLoading: state.loading === 'loading',
    isSuccess: state.loading === 'success',
    isError: state.loading === 'error',
  };
}

// Hook for mutation operations (POST, PUT, DELETE)
export function useMutation<T, R = void>(
  apiCall: (data: T) => Promise<ApiResponse<R>>,
  options: {
    onSuccess?: (data: R) => void;
    onError?: (error: string) => void;
    onSettled?: () => void;
  } = {}
) {
  const { onSuccess, onError, onSettled } = options;
  
  const [state, setState] = useState<AsyncState<R>>({
    data: null,
    loading: 'idle',
    error: null,
  });

  const mutate = useCallback(async (data: T): Promise<ApiResponse<R> | null> => {
    setState(prev => ({ ...prev, loading: 'loading', error: null }));

    try {
      const response = await apiCall(data);

      if (response.success && response.data) {
        setState({
          data: response.data,
          loading: 'success',
          error: null,
        });
        onSuccess?.(response.data);
      } else {
        setState({
          data: null,
          loading: 'error',
          error: response.error || 'Mutation failed',
        });
        onError?.(response.error || 'Mutation failed');
      }

      onSettled?.();
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      setState({
        data: null,
        loading: 'error',
        error: errorMessage,
      });

      onError?.(errorMessage);
      onSettled?.();
      throw error;
    }
  }, [apiCall, onSuccess, onError, onSettled]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: 'idle',
      error: null,
    });
  }, []);

  return {
    ...state,
    mutate,
    reset,
    isIdle: state.loading === 'idle',
    isLoading: state.loading === 'loading',
    isSuccess: state.loading === 'success',
    isError: state.loading === 'error',
  };
}

// Hook for optimistic updates
export function useOptimisticMutation<T, R = void>(
  apiCall: (data: T) => Promise<ApiResponse<R>>,
  options: {
    onSuccess?: (data: R) => void;
    onError?: (error: string) => void;
    optimisticUpdate?: (data: T) => void;
    rollbackUpdate?: () => void;
  } = {}
) {
  const { onSuccess, onError, optimisticUpdate, rollbackUpdate } = options;
  
  const [state, setState] = useState<AsyncState<R>>({
    data: null,
    loading: 'idle',
    error: null,
  });

  const mutate = useCallback(async (data: T): Promise<ApiResponse<R> | null> => {
    // Apply optimistic update immediately
    optimisticUpdate?.(data);

    setState(prev => ({ ...prev, loading: 'loading', error: null }));

    try {
      const response = await apiCall(data);

      if (response.success && response.data) {
        setState({
          data: response.data,
          loading: 'success',
          error: null,
        });
        onSuccess?.(response.data);
      } else {
        // Rollback optimistic update on error
        rollbackUpdate?.();
        setState({
          data: null,
          loading: 'error',
          error: response.error || 'Mutation failed',
        });
        onError?.(response.error || 'Mutation failed');
      }

      return response;
    } catch (error) {
      // Rollback optimistic update on error
      rollbackUpdate?.();
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      setState({
        data: null,
        loading: 'error',
        error: errorMessage,
      });

      onError?.(errorMessage);
      throw error;
    }
  }, [apiCall, onSuccess, onError, optimisticUpdate, rollbackUpdate]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: 'idle',
      error: null,
    });
  }, []);

  return {
    ...state,
    mutate,
    reset,
    isIdle: state.loading === 'idle',
    isLoading: state.loading === 'loading',
    isSuccess: state.loading === 'success',
    isError: state.loading === 'error',
  };
}
