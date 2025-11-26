import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Performance monitoring middleware
 */

interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  statusCode?: number;
  userAgent?: string;
  ip?: string;
}

// Store metrics in memory (in production, use Redis or database)
const metrics: PerformanceMetrics[] = [];
const MAX_METRICS = 1000; // Keep only last 1000 requests

/**
 * Request timing middleware
 */
export const requestTiming = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Add request ID to request object
  (req as any).requestId = requestId;
  (req as any).startTime = startTime;

  // Create metrics object
  const metric: PerformanceMetrics = {
    requestId,
    method: req.method,
    url: req.url,
    startTime,
    memoryUsage: process.memoryUsage(),
    userAgent: req.get('User-Agent') || '',
    ip: req.ip || req.connection.remoteAddress || ''
  };

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): any {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;
    metric.statusCode = res.statusCode;

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.url,
        duration,
        statusCode: res.statusCode,
        memoryUsage: process.memoryUsage()
      });
    }

    // Store metrics
    metrics.push(metric);
    
    // Keep only last MAX_METRICS
    if (metrics.length > MAX_METRICS) {
      metrics.shift();
    }

    // Log performance metrics
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      duration,
      statusCode: res.statusCode,
      memoryUsage: process.memoryUsage()
    });

    // Call original end
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Memory usage monitoring middleware
 */
export const memoryMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const memoryUsage = process.memoryUsage();
  const memoryUsageMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024)
  };

  // Log high memory usage
  if (memoryUsageMB.heapUsed > 500) { // More than 500MB
    logger.warn('High memory usage detected', {
      memoryUsage: memoryUsageMB,
      url: req.url,
      method: req.method
    });
  }

  // Add memory info to response headers in development
  if (process.env.NODE_ENV === 'development') {
    res.set('X-Memory-Usage', JSON.stringify(memoryUsageMB));
  }

  next();
};

/**
 * Database query monitoring middleware
 */
export const queryMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const queryCount = (req as any).queryCount || 0;
  const queryTime = (req as any).queryTime || 0;

  // Log slow database operations
  if (queryTime > 1000) { // More than 1 second
    logger.warn('Slow database operation detected', {
      requestId: (req as any).requestId,
      url: req.url,
      method: req.method,
      queryCount,
      queryTime
    });
  }

  // Add query info to response headers in development
  if (process.env.NODE_ENV === 'development') {
    res.set('X-Query-Count', queryCount.toString());
    res.set('X-Query-Time', queryTime.toString());
  }

  next();
};

/**
 * Response compression middleware
 */
export const responseCompression = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  res.json = function(obj: any) {
    // Compress large responses
    const responseSize = JSON.stringify(obj).length;
    
    if (responseSize > 1024) { // More than 1KB
      res.set('Content-Encoding', 'gzip');
      logger.info('Large response compressed', {
        requestId: (req as any).requestId,
        originalSize: responseSize,
        url: req.url
      });
    }
    
    return originalJson.call(this, obj);
  };

  next();
};

/**
 * Get performance metrics
 */
export const getPerformanceMetrics = (): {
  totalRequests: number;
  averageResponseTime: number;
  slowRequests: number;
  memoryUsage: NodeJS.MemoryUsage;
  recentRequests: PerformanceMetrics[];
} => {
  const totalRequests = metrics.length;
  const averageResponseTime = metrics.reduce((sum, metric) => {
    return sum + (metric.duration || 0);
  }, 0) / totalRequests;
  
  const slowRequests = metrics.filter(metric => (metric.duration || 0) > 1000).length;
  const recentRequests = metrics.slice(-10); // Last 10 requests

  return {
    totalRequests,
    averageResponseTime: Math.round(averageResponseTime),
    slowRequests,
    memoryUsage: process.memoryUsage(),
    recentRequests
  };
};

/**
 * Clear performance metrics
 */
export const clearPerformanceMetrics = (): void => {
  metrics.length = 0;
};

/**
 * Performance health check
 */
export const performanceHealthCheck = (): {
  status: 'healthy' | 'warning' | 'critical';
  metrics: any;
  recommendations: string[];
} => {
  const currentMetrics = getPerformanceMetrics();
  const memoryUsage = process.memoryUsage();
  const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
  
  const recommendations: string[] = [];
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';

  // Check memory usage
  if (memoryUsageMB > 1000) { // More than 1GB
    status = 'critical';
    recommendations.push('Memory usage is critically high. Consider restarting the application.');
  } else if (memoryUsageMB > 500) { // More than 500MB
    status = 'warning';
    recommendations.push('Memory usage is high. Monitor for memory leaks.');
  }

  // Check average response time
  if (currentMetrics.averageResponseTime > 2000) { // More than 2 seconds
    status = 'critical';
    recommendations.push('Average response time is critically high. Check database queries and external services.');
  } else if (currentMetrics.averageResponseTime > 1000) { // More than 1 second
    status = 'warning';
    recommendations.push('Average response time is high. Consider optimizing database queries.');
  }

  // Check slow requests percentage
  const slowRequestPercentage = (currentMetrics.slowRequests / currentMetrics.totalRequests) * 100;
  if (slowRequestPercentage > 20) { // More than 20% slow requests
    status = 'warning';
    recommendations.push('High percentage of slow requests. Review performance bottlenecks.');
  }

  return {
    status,
    metrics: currentMetrics,
    recommendations
  };
};
