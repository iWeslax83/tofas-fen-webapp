import { useEffect, useRef, useCallback, useState } from 'react';
import { useUIStore } from '../stores/uiStore';
import { safeConsoleError } from '../utils/safeLogger';

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
      
      if (renderTime > 16) { // More than one frame (60fps)
        console.warn(`[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms (render #${renderCount.current})`);
      }
    };
  });
};

/**
 * Hook to debounce function calls
 */
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...(args as any));
      }, delay);
    }) as T,
    [callback, delay]
  );
};

/**
 * Hook to throttle function calls
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCallRef = useRef<number>(0);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      }
    }) as T,
    [callback, delay]
  );
};

/**
 * Hook to memoize expensive calculations
 */
export const useMemoizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  const memoizedCallback = useRef<T>();
  const depsRef = useRef<React.DependencyList>();

  if (
    !memoizedCallback.current ||
    !depsRef.current ||
    deps.some((dep, index) => dep !== depsRef.current?.[index])
  ) {
    memoizedCallback.current = callback;
    depsRef.current = deps;
  }

  return memoizedCallback.current;
};

/**
 * Hook to measure and log performance metrics
 */
export const usePerformanceMetrics = () => {
  const { setGlobalLoading } = useUIStore();

  const measureAsync = useCallback(async <T>(
    name: string,
    asyncFn: () => Promise<T>,
    showLoading: boolean = false
  ): Promise<T> => {
    const startTime = performance.now();
    
    if (showLoading) {
      setGlobalLoading(true, `Loading ${name}...`);
    }

    try {
      const result = await asyncFn();
      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`[Performance] ${name} completed in ${duration.toFixed(2)}ms`);

      // Log slow operations
      if (duration > 1000) {
        console.warn(`[Performance] Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
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
  }, [setGlobalLoading]);

  const measureSync = useCallback(<T>(
    name: string,
    syncFn: () => T
  ): T => {
    const startTime = performance.now();
    
    try {
      const result = syncFn();
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (duration > 16) { // More than one frame
        console.warn(`[Performance] Slow sync operation: ${name} took ${duration.toFixed(2)}ms`);
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
    measureSync
  };
};

/**
 * Hook to optimize list rendering with virtualization
 */
export const useVirtualization = (
  itemCount: number,
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    itemCount
  );

  const visibleItems = Array.from(
    { length: visibleEnd - visibleStart },
    (_, index) => visibleStart + index
  );

  const totalHeight = itemCount * itemHeight;
  const offsetY = visibleStart * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop
  };
};

/**
 * Hook to optimize image loading
 */
export const useImageOptimization = () => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  const loadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (loadedImages.has(src)) {
        resolve();
        return;
      }

      if (loadingImages.has(src)) {
        // Wait for existing load to complete
        const checkLoaded = () => {
          if (loadedImages.has(src)) {
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
        return;
      }

      setLoadingImages(prev => new Set(prev).add(src));

      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => new Set(prev).add(src));
        setLoadingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(src);
          return newSet;
        });
        resolve();
      };
      img.onerror = () => {
        setLoadingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(src);
          return newSet;
        });
        reject(new Error(`Failed to load image: ${src}`));
      };
      img.src = src;
    });
  }, [loadedImages, loadingImages]);

  const isImageLoaded = useCallback((src: string) => {
    return loadedImages.has(src);
  }, [loadedImages]);

  const isImageLoading = useCallback((src: string) => {
    return loadingImages.has(src);
  }, [loadingImages]);

  return {
    loadImage,
    isImageLoaded,
    isImageLoading
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
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000); // Check every 5 seconds

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
    isMemoryHigh
  };
};
