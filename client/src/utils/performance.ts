// Performance utilities for React components
import { useCallback, useMemo, useRef, useEffect } from 'react';

// Debounce hook for search inputs
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Throttle hook for scroll events
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRun = useRef(Date.now());
  
  return useCallback((...args: Parameters<T>) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]) as T;
};

// Memoized component wrapper
export const withMemo = <P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  return React.memo(Component, areEqual);
};

// Lazy loading with preloading
export const createLazyComponent = <P extends object>(
  importFunc: () => Promise<{ default: React.ComponentType<P> }>,
  fallback?: React.ComponentType
) => {
  const LazyComponent = React.lazy(importFunc);
  
  // Preload the component
  const preload = () => {
    importFunc();
  };
  
  return {
    Component: LazyComponent,
    preload
  };
};

// Performance monitoring
export const usePerformanceMonitor = (componentName: string) => {
  const renderStart = useRef<number>(0);
  
  useEffect(() => {
    renderStart.current = performance.now();
    
    return () => {
      const renderTime = performance.now() - renderStart.current;
      if (renderTime > 16) { // More than one frame
        console.warn(`${componentName} render took ${renderTime.toFixed(2)}ms`);
      }
    };
  });
};

// Bundle size optimization
export const optimizeImports = {
  // Only import what you need from large libraries
  lodash: {
    debounce: () => import('lodash/debounce'),
    throttle: () => import('lodash/throttle'),
    isEmpty: () => import('lodash/isEmpty'),
  },
  
  // Date manipulation
  dateFns: {
    format: () => import('date-fns/format'),
    parseISO: () => import('date-fns/parseISO'),
    isAfter: () => import('date-fns/isAfter'),
  },
  
  // Icons - only import used icons
  lucide: {
    // Import icons individually to reduce bundle size
    User: () => import('lucide-react').then(mod => ({ default: mod.User })),
    Settings: () => import('lucide-react').then(mod => ({ default: mod.Settings })),
    // Add more as needed
  }
};

// Memory leak prevention
export const useCleanup = (cleanupFn: () => void) => {
  useEffect(() => {
    return cleanupFn;
  }, [cleanupFn]);
};

// Intersection Observer for lazy loading
export const useIntersectionObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
) => {
  const targetRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    
    const observer = new IntersectionObserver(callback, options);
    observer.observe(target);
    
    return () => observer.disconnect();
  }, [callback, options]);
  
  return targetRef;
};

// Virtual scrolling hook
export const useVirtualScroll = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );
    
    return items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight
    }));
  }, [items, itemHeight, containerHeight, scrollTop]);
  
  const totalHeight = items.length * itemHeight;
  
  return {
    visibleItems,
    totalHeight,
    setScrollTop
  };
};
