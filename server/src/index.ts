// Load environment variables first
import './config/environment';

// Initialize OpenTelemetry before other imports
import { initializeTelemetry } from './utils/telemetry';
initializeTelemetry();

import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";

// Middleware imports
import { 
  csrfProtection,
  sessionCache
} from './middleware';
import { 
  preventSQLInjection,
  preventXSS,
  sanitizeInput
} from './middleware/security';
import { globalErrorHandler } from './middleware/errorHandler';

// Monitoring ve logging imports
import logger from './utils/logger';
import monitoringService from './utils/monitoring';

// Modular routes
import authRoutes from './modules/auth/routes/authRoutes';
import userRoutes from './routes/User'; // Keep existing for now
import clubsRouter from "./routes/clubs";
import notificationRoutes from './routes/Notification';
import requestRoutes from './routes/Request';
import homeworkRoutes from "./routes/Homework";
import announcementRoutes from "./routes/Announcement";
import notesRoutes from "./routes/Notes";
import evciRequestRoutes from "./routes/EvciRequest";
import dormitoryRoutes from "./routes/Dormitory";
import monitoringRoutes from './routes/monitoring';
import scheduleRoutes from './routes/Schedule';
import mealListRoutes from './routes/MealList';
import supervisorListRoutes from './routes/SupervisorList';
import maintenanceRequestRoutes from './routes/MaintenanceRequest';
import analyticsRoutes from './routes/Analytics';
import calendarRoutes from './routes/Calendar';
import fileRoutes from './routes/files';
import communicationRoutes from './routes/Communication';
import performanceRoutes from './routes/Performance';
import auditLogRoutes from './routes/AuditLog';
import attendanceRoutes from './routes/Attendance';
import carziRequestRoutes from './routes/CarziRequest';
import dilekceRoutes from './routes/Dilekce';
import { connectDB } from "./db";
import { sendMail } from "./mailService";
import { setupSwagger } from './utils/swagger';
import { initializeWebSocket } from './utils/websocket';

const app = express();

// Güvenlik middleware'leri
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting - API isteklerini sınırla (env ile yapılandırılabilir)
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 500); // Increased for better UX

// General API rate limiter - more lenient for normal usage
const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',
    retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: any, res: any) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',
      retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
      limit: RATE_LIMIT_MAX_REQUESTS,
      windowMs: RATE_LIMIT_WINDOW_MS
    });
  }
});

// More lenient rate limiter for read-only endpoints (meals, announcements, etc.)
const readOnlyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 300, // 300 requests per 5 minutes for read-only data
  message: {
    error: 'Çok fazla okuma isteği gönderildi. Lütfen biraz bekleyin.',
    retryAfter: 300
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: any, res: any) => {
    res.status(429).json({
      error: 'Read rate limit exceeded',
      message: 'Çok fazla okuma isteği gönderildi. Lütfen biraz bekleyin.',
      retryAfter: 300,
      limit: 300,
      windowMs: 5 * 60 * 1000
    });
  }
});

// Very lenient rate limiter for meals endpoint specifically
const mealsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500, // 500 requests per 5 minutes for meals
  message: {
    error: 'Çok fazla yemek listesi isteği gönderildi. Lütfen biraz bekleyin.',
    retryAfter: 300
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: any, res: any) => {
    res.status(429).json({
      error: 'Meals rate limit exceeded',
      message: 'Çok fazla yemek listesi isteği gönderildi. Lütfen biraz bekleyin.',
      retryAfter: 300,
      limit: 500,
      windowMs: 5 * 60 * 1000
    });
  }
});

// Özel rate limiters (auth)
const AUTH_RATE_LIMIT_WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || RATE_LIMIT_WINDOW_MS);
const AUTH_RATE_LIMIT_MAX = Number(
  process.env.NODE_ENV === 'production' ? (process.env.AUTH_RATE_LIMIT_MAX || 5) : (process.env.AUTH_RATE_LIMIT_MAX || 100)
);

const authLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true, // Başarılı girişler sayılmaz
  message: {
    error: 'Çok fazla giriş denemesi. Lütfen biraz sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const UPLOAD_RATE_LIMIT_WINDOW_MS = Number(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000);
const UPLOAD_RATE_LIMIT_MAX = Number(process.env.UPLOAD_RATE_LIMIT_MAX || 10);

const uploadLimiter = rateLimit({
  windowMs: UPLOAD_RATE_LIMIT_WINDOW_MS,
  max: UPLOAD_RATE_LIMIT_MAX,
  message: {
    error: 'Çok fazla dosya yükleme denemesi. Lütfen daha sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Compression middleware
app.use(compression());

// Logs klasörünü oluştur
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Status monitor middleware - Basit monitoring dashboard
app.get('/status', (_req: any, res: any) => {
  const metrics = monitoringService.generateReport();
  res.json({
    title: 'Tofaş Fen Webapp Status',
    timestamp: new Date().toISOString(),
    metrics
  });
});



// Uploads klasörünü oluştur
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer konfigürasyonu
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Sadece resim ve video dosyalarına izin ver
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim ve video dosyaları yüklenebilir!'));
    }
  }
});

// CORS middleware, frontend port ve cookie desteği ile
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173", // Environment variable'dan al
  credentials: false, // JWT token'ları localStorage'da saklandığı için false
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token'],
  optionsSuccessStatus: 200, // Preflight istekleri için
}));

// JSON ve URL-encoded body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static dosya servisi için uploads klasörünü aç
app.use('/uploads', express.static(uploadsDir));

// JWT tabanlı kimlik doğrulama kullanıldığı için express-session kaldırıldı
// Session tabanlı kimlik doğrulama yerine JWT kullanılıyor

// Security middleware'leri
// JWT kullanıldığı için session security gerekmez
// app.use(sessionSecurity);

// Metrics middleware (before other middleware to track all requests)
import { metricsMiddleware } from './middleware/metrics';
app.use(metricsMiddleware);

// API versioning middleware
import { apiVersioningMiddleware, deprecationWarningMiddleware } from './middleware/apiVersioning';
app.use('/api', apiVersioningMiddleware);
app.use('/api', deprecationWarningMiddleware);

// Security middleware'leri
app.use(csrfProtection);
app.use(preventSQLInjection);
app.use(preventXSS);
app.use(sanitizeInput);

// Rate limiting uygula - specific limiters for different endpoint types
// Always apply rate limiting, but with different limits for development
if (process.env.NODE_ENV === 'production') {
  app.use('/api', generalLimiter);
  
  // More lenient rate limiting for read-only endpoints
  app.use('/api/dormitory/meals', mealsLimiter);
  app.use('/api/announcements', readOnlyLimiter);
  app.use('/api/notes', readOnlyLimiter);
  app.use('/api/schedule', readOnlyLimiter);
} else {
  // Development ortamında daha yüksek limitler ama yine de koruma
  const devLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 500, // 500 requests per minute in development (reduced from 1000)
    message: {
      error: 'Development rate limit exceeded',
      message: 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.',
      retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  app.use('/api', devLimiter);
}
// Always apply auth rate limiting for security
app.use('/api/auth', authLimiter);
app.use('/api/upload', uploadLimiter);

// Cache middleware
app.use(sessionCache);

// Swagger API Documentation is handled by setupSwagger function

// API Documentation endpoint
app.get('/api-docs-info', (_req: any, res: any) => {
  res.json({
    message: 'API Documentation',
    endpoints: {
      health: '/health',
      status: '/status',
      monitoring: '/api/monitoring',
      auth: '/api/auth',
      clubs: '/api/clubs',
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
      maintenance: '/api/maintenance',
      analytics: '/api/analytics',
      calendar: '/api/calendar',
      files: '/api/files',
      communication: '/api/communication',
      performance: '/api/performance',
    },
    timestamp: new Date().toISOString(),
  });
});

// Router'lar
app.use('/api/auth', authRoutes as any);
app.use("/api/clubs", clubsRouter as any);
app.use('/api/notifications', notificationRoutes as any);
app.use('/api/requests', requestRoutes as any);
app.use('/api/user', userRoutes as any);
app.use('/api/homeworks', homeworkRoutes as any);
app.use('/api/announcements', announcementRoutes as any);
app.use('/api/notes', notesRoutes as any);
app.use('/api/evci-requests', evciRequestRoutes as any);
app.use('/api/dormitory', dormitoryRoutes as any);
app.use('/api/schedule', scheduleRoutes as any);
app.use('/api/meals', mealListRoutes as any);
app.use('/api/supervisors', supervisorListRoutes as any);
app.use('/api/maintenance', maintenanceRequestRoutes as any);
app.use('/api/monitoring', monitoringRoutes as any);
app.use('/api/analytics', analyticsRoutes as any);
app.use('/api/calendar', calendarRoutes as any);
app.use('/api/files', fileRoutes as any);
app.use('/api/communication', communicationRoutes as any);
app.use('/api/performance', performanceRoutes as any);
app.use('/api/audit-logs', auditLogRoutes as any);
app.use('/api/attendance', attendanceRoutes as any);
app.use('/api/carzi-requests', carziRequestRoutes as any);
app.use('/api/dilekce', dilekceRoutes as any);

// Dashboard stats endpoint
app.use('/api/dashboard', analyticsRoutes as any);

// Dosya yükleme endpoint'i
app.post('/api/upload', upload.single('file'), (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Dosya yüklenmedi' });
    }
    
    // Dosya URL'ini döndür
    const fileUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.filename });
  } catch (error) {
    console.error('Dosya yükleme hatası:', error);
    res.status(500).json({ error: 'Dosya yüklenemedi' });
  }
});



// Prometheus metrics endpoint
app.get("/metrics", async (_req: any, res: any) => {
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
app.get("/health", async (_req: any, res: any) => {
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

// Basit ana sayfa kontrolü
app.get("/", (_req: any, res: any) => {
  res.send("Backend çalışıyor!");
});

app.post("/api/test-mail", async (req: any, res: any) => {
  const { to, subject, text } = req.body;
  try {
    const info = await sendMail(to, subject, text);
    res.json({ success: true, info });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errMsg });
  }
});

// Setup Swagger documentation
setupSwagger(app);

// Setup GraphQL server (BFF layer)
if (process.env.ENABLE_GRAPHQL === 'true' || process.env.NODE_ENV !== 'production') {
  import('./graphql/server')
    .then(({ createApolloServer }) => {
      const apolloServer = createApolloServer();
      apolloServer.start().then(() => {
        apolloServer.applyMiddleware({ app, path: '/graphql' });
        console.log(`🚀 GraphQL server ready at http://localhost:${PORT}${apolloServer.graphqlPath}`);
      });
    })
    .catch((err) => {
      // GraphQL is optional in local dev; log and continue if dependencies are missing
      logger && logger.warn
        ? logger.warn('GraphQL server could not be initialized (optional in dev)', { error: err.message })
        : console.warn('GraphQL server could not be initialized (optional in dev):', err.message);
    });
}

// 404 handler
app.use('*', (_req: any, res: any) => {
  res.status(404).json({ error: 'Endpoint bulunamadı' });
});

// Global error handler
app.use(globalErrorHandler);

// Sunucu başlat
const PORT = process.env.PORT || 3001;
connectDB()
  .then(async () => {
  const server = app.listen(PORT, async () => {
      logger.info(`🚀 Server started successfully`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      });
      
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔒 Security middleware active`);
      console.log(`⚡ Compression enabled`);
      console.log(`📝 Logging enabled`);
      console.log(`📈 Monitoring enabled - Status: http://localhost:${PORT}/status`);
      console.log(`📚 Swagger API Docs: http://localhost:${PORT}/api-docs`);
      console.log(`📚 API Info: http://localhost:${PORT}/api-docs-info`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      
      // Initialize WebSocket for real-time notifications
      initializeWebSocket(server);
      console.log(`🔔 WebSocket notifications enabled`);
      
      // Initialize event-driven architecture
      const { initializeEventDrivenWebSocket } = await import('./utils/websocket-enhanced');
      initializeEventDrivenWebSocket();
      console.log(`⚡ Event-driven architecture enabled`);
    });
  })
  .catch((err) => {
    logger.error("MongoDB connection failed", { error: err.message });
    console.error("MongoDB bağlantı hatası:", err);
    process.exit(1);
  });
