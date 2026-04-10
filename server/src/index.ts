// Load environment variables first
import './config/environment';

// Bulletproof early uncaughtException trap — writes directly to stderr so
// the actual stack trace is visible even when winston/logger is in a bad
// state. Installed BEFORE any other module so nothing can mask it.
process.on('uncaughtException', (err: Error) => {
  process.stderr.write(
    `\n[FATAL uncaughtException] ${err?.stack || err?.message || String(err)}\n`,
  );
});
process.on('unhandledRejection', (reason: unknown) => {
  const r = reason instanceof Error ? reason.stack || reason.message : String(reason);
  process.stderr.write(`\n[FATAL unhandledRejection] ${r}\n`);
});

// Initialize OpenTelemetry before other imports
import { initializeTelemetry } from './utils/telemetry';
initializeTelemetry();

import express from 'express';
// Monkey-patch Express 4 to forward async route errors to next() automatically.
// Without this, a rejected promise in any async route handler crashes the
// process (Express 4 does not propagate async rejections). Must be imported
// once, after express, before any routes are mounted.
import 'express-async-errors';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

// Modular config imports (extracted from monolithic index.ts)
import { configureCors } from './config/cors';
import { applyRateLimiters } from './config/rateLimiters';
import { setupUploadRoutes } from './config/upload';
import { registerRoutes } from './config/routes';

// Middleware imports
import { csrfProtection, sessionCache } from './middleware';
import { preventSQLInjection, preventXSS, sanitizeInput } from './middleware/security';
import { globalErrorHandler } from './middleware/errorHandler';
import { wafMiddleware, cloudflareHeaders, initWafRedis } from './middleware/waf';
import { initSecurityAlertRedis } from './services/SecurityAlertService';
import { redis as cacheRedis, isRedisConfigured } from './middleware/cache';
import { requestTiming } from './middleware/performance';

// Monitoring and logging imports
import logger, { morganStream } from './utils/logger';
import monitoringService from './utils/monitoring';
import { validateConfig } from './config/environment';

import mongoose from 'mongoose';
import { connectDB } from './db';
import { setupSwagger } from './utils/swagger';
import { initializeWebSocket, getWebSocket } from './utils/websocket';
import { SchedulerService } from './services/SchedulerService';
import { migrateEvciRequests } from './models/EvciRequest';

const app = express();

// Configuration validation (catch errors at startup)
validateConfig();

// HTTP request logging (Morgan -> Winston)
app.use(morgan('combined', { stream: morganStream }));

// Cloudflare headers (if behind Cloudflare)
app.use(cloudflareHeaders);

// B-L3: request ID generation must happen BEFORE any middleware that logs,
// so WAF blocks, rate-limit rejections, and error responses all carry the
// same ID that'll correlate across Sentry, Winston, and OpenTelemetry.
app.use(requestTiming);

// WAF middleware - basic request filtering and IP blocking
app.use(wafMiddleware);

// Security headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        scriptSrc: ["'self'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:5173'],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        // CSP violation reporting
        ...(process.env.CSP_REPORT_URI ? { reportUri: [process.env.CSP_REPORT_URI] } : {}),
      },
    },
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
  }),
);

// Compression middleware
app.use(compression());

// Logs directory
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Status monitor endpoint
app.get('/status', (_req: express.Request, res: express.Response) => {
  const metrics = monitoringService.generateReport();
  res.json({
    title: 'Tofas Fen Webapp Status',
    timestamp: new Date().toISOString(),
    metrics,
  });
});

// CORS middleware
app.use(configureCors());

// Cookie parser
app.use(cookieParser());

// JSON and URL-encoded body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Metrics middleware (before other middleware to track all requests)
import { metricsMiddleware } from './middleware/metrics';
app.use(metricsMiddleware);

// API versioning middleware
import { apiVersioningMiddleware, deprecationWarningMiddleware } from './middleware/apiVersioning';
app.use('/api', apiVersioningMiddleware);
app.use('/api', deprecationWarningMiddleware);

// Security middleware
app.use(csrfProtection);
app.use(preventSQLInjection);
app.use(preventXSS);
app.use(sanitizeInput);

// Rate limiting (extracted to config/rateLimiters.ts)
applyRateLimiters(app);

// Cache middleware
app.use(sessionCache);

// API Documentation endpoint
app.get('/api-docs-info', (_req: express.Request, res: express.Response) => {
  res.json({
    message: 'API Documentation',
    endpoints: {
      health: '/health',
      status: '/status',
      monitoring: '/api/monitoring',
      auth: '/api/auth',
      notifications: '/api/notifications',
      requests: '/api/requests',
      user: '/api/user',
      homeworks: '/api/homeworks',
      announcements: '/api/announcements',
      notes: '/api/notes',
      evciRequests: '/api/evci-requests',
      dormitory: '/api/dormitory',
      schedule: '/api/schedule',
      meals: '/api/meals',
      supervisors: '/api/supervisors',
      calendar: '/api/calendar',
      communication: '/api/communication',
      performance: '/api/performance',
      kvkk: '/api/kvkk',
    },
    timestamp: new Date().toISOString(),
  });
});

// Register all API routes (extracted to config/routes.ts)
registerRoutes(app);

// File upload routes (extracted to config/upload.ts)
setupUploadRoutes(app);

// Prometheus metrics endpoint
app.get('/metrics', async (_req: express.Request, res: express.Response) => {
  try {
    const { register } = await import('./utils/metrics');
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error('Metrics endpoint failed', { error: errMsg });
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Health check endpoint
app.get('/health', async (_req: express.Request, res: express.Response) => {
  try {
    const healthCheck = await monitoringService.performHealthCheck();
    res.json(healthCheck);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error('Health check failed', { error: errMsg });
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// Root endpoint
app.get('/', (_req: express.Request, res: express.Response) => {
  res.send('Backend running!');
});

// Setup Swagger documentation
setupSwagger(app);

// Setup GraphQL server (BFF layer)
if (process.env.ENABLE_GRAPHQL === 'true' || process.env.NODE_ENV !== 'production') {
  // B-H6: rate-limit the GraphQL endpoint before Apollo middleware sees it.
  // Depth/complexity limits handle one expensive query, not sustained cheap ones.
  import('./config/rateLimiters').then(({ graphqlLimiter }) => {
    app.use('/graphql', graphqlLimiter);
  });

  import('./graphql/server')
    .then(({ createApolloServer }) => {
      const apolloServer = createApolloServer();
      apolloServer.start().then(() => {
        apolloServer.applyMiddleware({ app, path: '/graphql' });
        logger.info(`GraphQL server ready at http://localhost:${PORT}${apolloServer.graphqlPath}`);
      });
    })
    .catch((err) => {
      logger.warn('GraphQL server could not be initialized (optional in dev)', {
        error: err.message,
      });
    });
}

// 404 handler
app.use('*', (_req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Endpoint bulunamadi' });
});

// Global error handler
app.use(globalErrorHandler);

// Start server
const PORT = process.env.PORT || 3001;

// Export app for testing
export { app };

if (process.env.NODE_ENV !== 'test') {
  connectDB()
    .then(async () => {
      const server = app.listen(PORT, async () => {
        logger.info(`Server started successfully`, {
          port: PORT,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString(),
        });

        logger.info(`Server running on http://localhost:${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`Security: WAF + Helmet + CSRF + Rate Limiting active`);
        logger.info(`Monitoring: http://localhost:${PORT}/status`);
        logger.info(`Swagger: http://localhost:${PORT}/api-docs`);
        logger.info(`Health: http://localhost:${PORT}/health`);

        // Initialize Redis-backed services (WAF, SecurityAlerts)
        if (isRedisConfigured) {
          initWafRedis(cacheRedis);
          initSecurityAlertRedis(cacheRedis);
        }

        // Initialize WebSocket for real-time notifications
        initializeWebSocket(server);
        logger.info(`WebSocket notifications enabled`);

        // Initialize event-driven architecture
        const { initializeEventDrivenWebSocket } = await import('./utils/websocket-enhanced');
        initializeEventDrivenWebSocket();
        logger.info(`Event-driven architecture enabled`);

        // Migrate existing evci requests (one-time, idempotent).
        // Errors here are non-fatal — the server should still start even if
        // the migration can't run. Skip entirely when SKIP_EVCI_MIGRATION=true
        // (useful for fresh-db deployments and for sidestepping connection-
        // readiness races with the scheduler / WAF init above).
        if (process.env.SKIP_EVCI_MIGRATION !== 'true') {
          migrateEvciRequests()
            .then(() => logger.info('EvciRequest migration completed'))
            .catch((err: unknown) => {
              const message = err instanceof Error ? err.message : String(err);
              const stack = err instanceof Error ? err.stack : undefined;
              logger.error('EvciRequest migration failed', { message, stack });
            });
        } else {
          logger.info('EvciRequest migration skipped (SKIP_EVCI_MIGRATION=true)');
        }

        // Initialize scheduler for cron jobs (evci reminders etc.)
        SchedulerService.initialize();
        logger.info(`Scheduler service initialized`);

        // Graceful shutdown handler
        let isShuttingDown = false;
        const gracefulShutdown = async (signal: string) => {
          if (isShuttingDown) return;
          isShuttingDown = true;

          logger.info(`Received ${signal}. Starting graceful shutdown...`);

          // 1. Close HTTP server (stop accepting new connections)
          server.close(() => {
            logger.info('HTTP server closed');
          });

          // 2. Close WebSocket connections
          const ws = getWebSocket();
          if (ws) {
            ws.disconnectAll();
            logger.info('WebSocket connections closed');
          }

          // 3. Close Redis connections
          if (isRedisConfigured && cacheRedis) {
            try {
              await cacheRedis.quit();
              logger.info('Redis connection closed');
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err);
              logger.error('Error closing Redis connection', { error: errMsg });
            }
          }

          // 4. Close MongoDB connection
          try {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed');
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            logger.error('Error closing MongoDB connection', { error: errMsg });
          }

          logger.info('Graceful shutdown complete');
          process.exit(0);
        };

        // Force exit after 15 seconds if graceful shutdown stalls
        const forceExit = (signal: string) => {
          gracefulShutdown(signal);
          setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
          }, 15000).unref();
        };

        process.on('SIGTERM', () => forceExit('SIGTERM'));
        process.on('SIGINT', () => forceExit('SIGINT'));
      });
    })
    .catch((err) => {
      logger.error('MongoDB connection failed', { error: err.message });
      process.exit(1);
    });
}
