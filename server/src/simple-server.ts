import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { config, validateConfig } from './config/environment';
import { connectDB } from './db';
import { healthCheck } from './health-check';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { securityHeaders } from './middleware/security';
import { validateRequest } from './middleware/validation';
import { cacheMiddleware } from './middleware/cache';
import { performanceMiddleware } from './middleware/performance';
import { monitoringMiddleware } from './middleware/monitoring';
import { v1Routes } from './routes/v1';
import { seedDatabase } from './seed/seedDatabase';
import { startScheduledTasks } from './services/scheduledTasks';

// Validate configuration
validateConfig();

const app = express();

// Security middleware
app.use(helmet());
app.use(securityHeaders);

// CORS configuration
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(requestLogger);

// Performance monitoring
app.use(performanceMiddleware);

// Monitoring
app.use(monitoringMiddleware);

// Caching
app.use(cacheMiddleware);

// Health check
app.get('/health', healthCheck);

// API routes with versioning
app.use('/api/v1', v1Routes);

// Legacy API routes for backward compatibility
app.use('/api/auth', v1Routes);
app.use('/api/users', v1Routes);
app.use('/api/notes', v1Routes);
app.use('/api/announcements', v1Routes);
app.use('/api/homeworks', v1Routes);
app.use('/api/schedules', v1Routes);
app.use('/api/clubs', v1Routes);
app.use('/api/notifications', v1Routes);
app.use('/api/requests', v1Routes);
app.use('/api/meal-lists', v1Routes);
app.use('/api/supervisor-lists', v1Routes);
app.use('/api/maintenance-requests', v1Routes);
app.use('/api/evci-requests', v1Routes);
app.use('/api/analytics', v1Routes);
app.use('/api/reports', v1Routes);
app.use('/api/calendars', v1Routes);
app.use('/api/files', v1Routes);
app.use('/api/communication', v1Routes);
app.use('/api/performance', v1Routes);
app.use('/api/monitoring', v1Routes);
app.use('/api/dashboard', v1Routes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Seed database in development
    if (config.NODE_ENV === 'development') {
      await seedDatabase();
    }
    
    // Start scheduled tasks
    startScheduledTasks();
    
    // Start server
    app.listen(config.PORT, () => {
      console.log(`🚀 Server running on port ${config.PORT}`);
      console.log(`📊 Environment: ${config.NODE_ENV}`);
      console.log(`🔗 Frontend URL: ${config.FRONTEND_URL}`);
      console.log(`💾 Database: ${config.MONGODB_URI}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();