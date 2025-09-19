import React, { useEffect, useState } from 'react';
import { usePerformanceMonitor } from '../utils/performance';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  bundleSize: number;
  loadTime: number;
}

interface PerformanceMonitorProps {
  componentName: string;
  enabled?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  componentName,
  enabled = process.env.NODE_ENV === 'development'
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    bundleSize: 0,
    loadTime: 0
  });

  usePerformanceMonitor(componentName);

  useEffect(() => {
    if (!enabled) return;

    const startTime = performance.now();
    
    // Monitor memory usage
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / 1024 / 1024 // MB
        }));
      }
    };

    // Monitor bundle size (approximate)
    const updateBundleSize = () => {
      const scripts = document.querySelectorAll('script[src]');
      let totalSize = 0;
      scripts.forEach(script => {
        const src = script.getAttribute('src');
        if (src && src.includes('assets')) {
          // This is a rough estimate
          totalSize += 50; // KB per chunk
        }
      });
      setMetrics(prev => ({
        ...prev,
        bundleSize: totalSize
      }));
    };

    const endTime = performance.now();
    setMetrics(prev => ({
      ...prev,
      renderTime: endTime - startTime,
      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart
    }));

    updateMemoryUsage();
    updateBundleSize();

    const interval = setInterval(updateMemoryUsage, 1000);
    return () => clearInterval(interval);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="performance-monitor">
      <h4>Performance Metrics - {componentName}</h4>
      <div className="metrics-grid">
        <div className="metric">
          <span className="metric-label">Render Time:</span>
          <span className="metric-value">{metrics.renderTime.toFixed(2)}ms</span>
        </div>
        <div className="metric">
          <span className="metric-label">Memory Usage:</span>
          <span className="metric-value">{metrics.memoryUsage.toFixed(2)}MB</span>
        </div>
        <div className="metric">
          <span className="metric-label">Bundle Size:</span>
          <span className="metric-value">{metrics.bundleSize}KB</span>
        </div>
        <div className="metric">
          <span className="metric-label">Load Time:</span>
          <span className="metric-value">{metrics.loadTime}ms</span>
        </div>
      </div>
    </div>
  );
};

// HOC for automatic performance monitoring
export const withPerformanceMonitor = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  return (props: P) => (
    <>
      <Component {...props} />
      <PerformanceMonitor componentName={componentName} />
    </>
  );
};
