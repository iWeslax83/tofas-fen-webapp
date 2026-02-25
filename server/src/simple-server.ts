import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { config, validateConfig } from './config/environment';
import { connectDB } from './db';
// import { healthCheck } from './health-check';
import { globalErrorHandler } from './middleware/errorHandler';
// import { requestLogger } from './middleware/requestLogger';
import { securityHeaders } from './middleware/security';
// import { validateRequest } from './middleware/validation';
// import { cacheMiddleware } from './middleware/cache';
// import { performanceMiddleware } from './middleware/performance';
// import { monitoringMiddleware } from './middleware/monitoring';
import { v1Routes } from './routes/v1';
// import { seedDatabase } from './seed/seedDatabase';
// import { startScheduledTasks } from './services/scheduledTasks';

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
  message: { error: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
// app.use(requestLogger);

// Performance monitoring
// app.use(performanceMiddleware);

// Monitoring
// app.use(monitoringMiddleware);

// Caching
// app.use(cacheMiddleware);

// Health check
// app.get('/health', healthCheck);

// API routes
app.use('/api', v1Routes);

// Error handling
app.use(globalErrorHandler);

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Seed database in development
    // if (config.NODE_ENV === 'development') {
    //   await seedDatabase();
    // }
    
    // Start scheduled tasks
    // startScheduledTasks();
    
    // Start server
    app.listen(config.PORT, () => {
      console.log(`🚀 Server running on port ${config.PORT}`);
      console.log(`📊 Environment: ${config.NODE_ENV}`);
      console.log(`🔗 Frontend URL: ${config.FRONTEND_URL}`);
      console.log(`💾 Database: ${config.MONGODB_URI}`);
    });
  } catch (error) {
    console.error('❌ Sunucu başlatılamadı:', error);
    process.exit(1);
  }
};

// Yakalanamayan istisnaları yönet
process.on('uncaughtException', (error) => {
  console.error('❌ Yakalanamayan İstisnai:', error);
  process.exit(1);
});

// Yönetilmeyen promise reddemelerini yönet
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Yönetilmeyen Reddedilme:', promise, 'neden:', reason);
  process.exit(1);
});

// Nazik kapat
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM alındı, detaylı şekilde kapatılıyor');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();