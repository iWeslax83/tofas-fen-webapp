import cors from 'cors';
import logger from '../utils/logger';

/**
 * CORS configuration - extracted from index.ts for modularity.
 */
export function createCorsOptions() {
  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = [
        process.env.CORS_ORIGIN || 'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
      ];

      if (process.env.NODE_ENV === 'development') {
        let isLocalOrigin = false;
        if (origin) {
          try {
            const url = new URL(origin);
            isLocalOrigin = (url.hostname === 'localhost' || url.hostname === '127.0.0.1') && url.protocol === 'http:';
          } catch {
            isLocalOrigin = false;
          }
        }
        if (!origin || isLocalOrigin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS policy: Origin not allowed in development'));
        }
      } else {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS policy: Origin not allowed'));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    exposedHeaders: ['X-CSRF-Token'],
    optionsSuccessStatus: 200,
  };
}

export function configureCors() {
  return cors(createCorsOptions());
}
