import cors from 'cors';

/**
 * CORS configuration - extracted from index.ts for modularity.
 */
export function createCorsOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && !process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN environment variable is required in production');
  }

  const allowedOrigins: string[] = [];

  if (process.env.CORS_ORIGIN) {
    allowedOrigins.push(process.env.CORS_ORIGIN);
  }

  if (!isProduction) {
    allowedOrigins.push(
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    );
  }

  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!isProduction) {
        let isLocalOrigin = false;
        if (origin) {
          try {
            const url = new URL(origin);
            isLocalOrigin =
              (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
              url.protocol === 'http:';
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
