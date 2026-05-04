import { useEffect, useRef, useCallback, useState } from 'react';
import { useUIStore } from '../stores/uiStore';
import { safeConsoleError } from '../utils/safeLogger';
import { safeConsoleWarn } from '../utils/safeLogger';

/**
 * Performance monitoring and optimization hooks
 */

/**
 * Hook to measure component render performance
 */
export const useRenderPerformance = (componentName: string) => {
  const renderStart = useRef<number>(0);
  const renderCount = useRef<number>(0);

  useEffect(() => {
    renderStart.current = performance.now();
    renderCount.current += 1;

    return () => {
      const renderTime = performance.now() - renderStart.current;

      if (import.meta.env.DEV && renderTime > 16) {
        // More than one frame (60fps)
        safeConsoleWarn(
          `[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms (render #${renderCount.current})`,
        );
      }
    };
  });
};

/**
 * Hook to debounce function calls
 */
export const useDebounce = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number,
): T => {
  const timeoutRef = useRef<number | undefined>(undefined);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (callback as any)(...args);
      }, delay);
    },
    [callback, delay],
  ) as unknown as T;
};

/**
 * Hook to throttle function calls
 */
export const useThrottle = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number,
): T => {
  const lastCallRef = useRef<number>(0);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (callback as any)(...args);
      }
    },
    [callback, delay],
  ) as unknown as T;
};

/**
 * Hook to memoize expensive calculations
 */
export const useMemoizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
): T => {
  // Use useCallback with provided deps to produce a stable memoized function
  // This avoids reading/updating refs during render and preserves behavior

  return useCallback((...args: Parameters<T>) => {
    // Call the latest callback according to deps
    return callback(...args);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps) as T;
};

/**
 * Hook to measure and log performance metrics
 */
export const usePerformanceMetrics = () => {
  const { setGlobalLoading } = useUIStore();

  const measureAsync = useCallback(
    async <T>(
      name: string,
      asyncFn: () => Promise<T>,
      showLoading: boolean = false,
    ): Promise<T> => {
      const startTime = performance.now();

      if (showLoading) {
        setGlobalLoading(true, `Loading ${name}...`);
      }

      try {
        const result = await asyncFn();
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Log slow operations in development
        if (import.meta.env.DEV && duration > 1000) {
          safeConsoleWarn(
            `[Performance] Slow operation detected: ${name} took ${duration.toFixed(2)}ms`,
          );
        }

        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        safeConsoleError(`[Performance] ${name} failed after ${duration.toFixed(2)}ms:`, error);
        throw error;
      } finally {
        if (showLoading) {
          setGlobalLoading(false);
        }
      }
    },
    [setGlobalLoading],
  );

  const measureSync = useCallback(<T>(name: string, syncFn: () => T): T => {
    const startTime = performance.now();

    try {
      const result = syncFn();
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (import.meta.env.DEV && duration > 16) {
        // More than one frame
        safeConsoleWarn(`[Performance] Slow sync operation: ${name} took ${duration.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      safeConsoleError(`[Performance] ${name} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }, []);

  return {
    measureAsync,
    measureSync,
  };
};

/**
 * Hook to optimize list rendering with virtualization
 */
export const useVirtualization = (
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    itemCount,
  );

  const visibleItems = Array.from(
    { length: visibleEnd - visibleStart },
    (_, index) => visibleStart + index,
  );

  const totalHeight = itemCount * itemHeight;
  const offsetY = visibleStart * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop,
  };
};

/**
 * Hook to optimize image loading
 */
export const useImageOptimization = () => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  const loadedImagesRef = useRef<Set<string>>(loadedImages);
  const loadingImagesRef = useRef<Set<string>>(loadingImages);

  useEffect(() => {
    loadedImagesRef.current = loadedImages;
  }, [loadedImages]);

  useEffect(() => {
    loadingImagesRef.current = loadingImages;
  }, [loadingImages]);

  const loadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (loadedImagesRef.current.has(src)) {
        resolve();
        return;
      }

      if (loadingImagesRef.current.has(src)) {
        // Wait for existing load to complete with timeout
        let attempts = 0;
        const maxAttempts = 100; // 10 second timeout
        const checkLoaded = () => {
          if (loadedImagesRef.current.has(src)) {
            resolve();
          } else if (!loadingImagesRef.current.has(src) || attempts >= maxAttempts) {
            reject(new Error(`Image load timeout or failed: ${src}`));
          } else {
            attempts++;
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
        return;
      }

      setLoadingImages((prev) => {
        const next = new Set(prev);
        next.add(src);
        return next;
      });

      const img = new Image();
      img.onload = () => {
        setLoadedImages((prev) => {
          const next = new Set(prev);
          next.add(src);
          return next;
        });
        setLoadingImages((prev) => {
          const newSet = new Set(prev);
          newSet.delete(src);
          return newSet;
        });
        resolve();
      };
      img.onerror = () => {
        setLoadingImages((prev) => {
          const newSet = new Set(prev);
          newSet.delete(src);
          return newSet;
        });
        reject(new Error(`Resim yüklenemedi: ${src}`));
      };
      img.src = src;
    });
  }, []);

  const isImageLoaded = useCallback((src: string) => {
    return loadedImagesRef.current.has(src);
  }, []);

  const isImageLoading = useCallback((src: string) => {
    return loadingImagesRef.current.has(src);
  }, []);

  return {
    loadImage,
    isImageLoaded,
    isImageLoading,
  };
};

/**
 * Hook to monitor memory usage
 */
export const useMemoryMonitor = () => {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 60000); // Check every 60 seconds

    return () => clearInterval(interval);
  }, []);

  const getMemoryUsagePercentage = useCallback(() => {
    if (!memoryInfo) return 0;
    return (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
  }, [memoryInfo]);

  const isMemoryHigh = useCallback(() => {
    return getMemoryUsagePercentage() > 80;
  }, [getMemoryUsagePercentage]);

  return {
    memoryInfo,
    getMemoryUsagePercentage,
    isMemoryHigh,
  };
};
