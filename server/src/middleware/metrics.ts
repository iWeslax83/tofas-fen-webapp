/**
 * Metrics Middleware
 * Track HTTP request metrics
 */

import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestTotal, httpRequestErrors } from '../utils/metrics';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const route = req.route?.path || req.path || 'unknown';

  // Track response finish
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
    };

    // Record metrics
    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);

    // Track errors (4xx and 5xx)
    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      httpRequestErrors.inc({
        method: req.method,
        route,
        error_type: errorType,
      });
    }
  });

  next();
}

