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
import cookieParser from "cookie-parser";
import morgan from "morgan";

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
import logger, { morganStream } from './utils/logger';
import monitoringService from './utils/monitoring';
import { validateConfig } from './config/environment';

// Modular routes
import authRoutes from './modules/auth/routes/authRoutes';
import userRoutes from './routes/User'; // Keep existing for now

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
// import maintenanceRequestRoutes from './routes/MaintenanceRequest'; // File doesn't exist
// import analyticsRoutes from './routes/Analytics';
import calendarRoutes from './routes/Calendar';
// import fileRoutes from './routes/files';
import communicationRoutes from './routes/Communication';
import performanceRoutes from './routes/Performance';
import auditLogRoutes from './routes/AuditLog';
// import attendanceRoutes from './routes/Attendance';
import dilekceRoutes from './routes/Dilekce';
import pushSubscriptionRoutes from './routes/PushSubscription';
import registrationRoutes from './routes/Registration';
import appointmentRoutes from './routes/Appointment';
import visitorChatRoutes from './routes/VisitorChat';
import { connectDB } from "./db";
import dashboardRoutes from './routes/Dashboard';
import { sendMail } from "./mailService";
import { setupSwagger } from './utils/swagger';
import { initializeWebSocket } from './utils/websocket';
import { SchedulerService } from './services/SchedulerService';
import { migrateEvciRequests } from './models/EvciRequest';

const app = express();

// Konfigürasyon doğrulama (startup'ta hataları yakala)
validateConfig();

// HTTP request logging (Morgan -> Winston)
app.use(morgan('combined', { stream: morganStream }));

// Güvenlik middleware'leri
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || "http://localhost:5173"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  // Clickjacking koruması
  frameguard: { action: 'deny' },
  // MIME-type sniffing koruması
  noSniff: true,
  // XSS filtresi
  xssFilter: true,
}));

// Rate limiting - API isteklerini sınırla (env ile yapılandırılabilir)
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 5 * 60 * 1000);
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
  handler: (_req: express.Request, res: express.Response) => {
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
  handler: (_req: express.Request, res: express.Response) => {
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
  handler: (_req: express.Request, res: express.Response) => {
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
app.get('/status', (_req: express.Request, res: express.Response) => {
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
    // GÜVENLİK: Sadece dosya adının son kısmını al (directory traversal önlemi)
    const safeOriginalName = path.basename(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(safeOriginalName));
  }
});

// GÜVENLİK: İzin verilen dosya uzantıları ve MIME tipleri whitelist
const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  '.mp4': ['video/mp4'],
  '.webm': ['video/webm'],
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimes = ALLOWED_FILE_TYPES[ext];

    // Uzantı whitelist kontrolü
    if (!allowedMimes) {
      return cb(new Error(`İzin verilmeyen dosya uzantısı: ${ext}. İzin verilenler: ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}`));
    }

    // MIME tipi ve uzantı eşleşme kontrolü (spoofing önlemi)
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error(`Dosya uzantısı (${ext}) ile MIME tipi (${file.mimetype}) eşleşmiyor`));
    }

    cb(null, true);
  }
});

// CORS middleware, frontend port ve cookie desteği ile
// ⚠️ GÜVENLİK: credentials: true - httpOnly cookies için gerekli
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Tüm environment'larda whitelist kullan (güvenlik için)
    const allowedOrigins = [
      process.env.CORS_ORIGIN || "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
    ];

    // Development'ta localhost origin'lerine izin ver, production'da sadece whitelist
    // GÜVENLİK: NODE_ENV yoksa production gibi davran (restrictive default)
    if (process.env.NODE_ENV === 'development') {
      // Development: localhost/127.0.0.1 origin'leri veya whitelist'teki origin'ler
      // GÜVENLİK: startsWith yerine URL parse kullanarak subdomain bypass önlenir
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
      // Production: Sadece whitelist'teki origin'ler
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy: Origin not allowed'));
      }
    }
  },
  credentials: true, // httpOnly cookies için gerekli
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token'],
  optionsSuccessStatus: 200, // Preflight istekleri için
};

app.use(cors(corsOptions));

// Cookie parser - httpOnly cookies için gerekli
app.use(cookieParser());

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
// ✅ GÜVENLİK: Tüm environment'larda rate limiting aktif (development'ta daha yüksek limitlerle)
// Development'ta da rate limiting aktif olmalı (güvenlik ve test için)
const devLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 500, // 500 requests per minute in development (yeterince yüksek ama koruma sağlıyor)
  message: {
    error: 'Development rate limit exceeded',
    message: 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

if (process.env.NODE_ENV === 'production') {
  // Production: Daha sıkı limitler
  app.use('/api', generalLimiter);

  // More lenient rate limiting for read-only endpoints
  app.use('/api/dormitory/meals', mealsLimiter);
  app.use('/api/announcements', readOnlyLimiter);
  app.use('/api/notes', readOnlyLimiter);
  app.use('/api/schedule', readOnlyLimiter);
} else {
  // Development: Daha yüksek limitler ama yine de koruma
  app.use('/api', devLimiter);

  // Development'ta da read-only endpoint'ler için özel limitler (daha yüksek)
  const devReadOnlyLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 500, // 500 requests per 5 minutes in development
    message: {
      error: 'Development read rate limit exceeded',
      message: 'Çok fazla okuma isteği gönderildi. Lütfen biraz bekleyin.',
      retryAfter: 300
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/dormitory/meals', devReadOnlyLimiter);
  app.use('/api/announcements', devReadOnlyLimiter);
  app.use('/api/notes', devReadOnlyLimiter);
  app.use('/api/schedule', devReadOnlyLimiter);
}
// Always apply auth rate limiting for security
app.use('/api/auth', authLimiter);
app.use('/api/upload', uploadLimiter);

// Cache middleware
app.use(sessionCache);

// Swagger API Documentation is handled by setupSwagger function

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

// Router'lar - Type safety: Express Router tipi zaten doğru, 'as any' gerekmez
app.use('/api/auth', authRoutes);

app.use('/api/notifications', notificationRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/user', userRoutes);
app.use('/api/users', userRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/homeworks', homeworkRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/evci-requests', evciRequestRoutes);
app.use('/api/dormitory', dormitoryRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/meals', mealListRoutes);
app.use('/api/supervisors', supervisorListRoutes);
// app.use('/api/maintenance', maintenanceRequestRoutes); // Route file doesn't exist
app.use('/api/monitoring', monitoringRoutes);
// app.use('/api/analytics', analyticsRoutes);
app.use('/api/calendar', calendarRoutes);
// app.use('/api/files', fileRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/audit-logs', auditLogRoutes);
// app.use('/api/attendance', attendanceRoutes);
app.use('/api/dilekce', dilekceRoutes);
app.use('/api/push', pushSubscriptionRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/visitor-chat', visitorChatRoutes);

// Dashboard stats endpoint - now active
app.use('/api/dashboard', dashboardRoutes);

// Dosya yükleme endpoint'i
// GÜVENLİK: Magic byte doğrulaması - dosya içeriğinin gerçekten iddia edilen türde olduğunu kontrol eder
const MAGIC_BYTES: Record<string, Buffer[]> = {
  '.jpg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  '.jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  '.png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  '.gif': [Buffer.from([0x47, 0x49, 0x46, 0x38])],
  '.webp': [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF header
  '.pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF
  '.doc': [Buffer.from([0xD0, 0xCF, 0x11, 0xE0])], // OLE2
  '.docx': [Buffer.from([0x50, 0x4B, 0x03, 0x04])], // ZIP (OOXML)
};

function validateMagicBytes(filePath: string, ext: string): boolean {
  const signatures = MAGIC_BYTES[ext];
  if (!signatures) return false; // Bilinmeyen uzantılar reddedilir (whitelist yaklaşımı)

  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(8);
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    return signatures.some(sig => buffer.subarray(0, sig.length).equals(sig));
  } catch {
    return false;
  }
}

app.post('/api/upload', upload.single('file'), (req: express.Request, res: express.Response) => {
  try {
    const file = (req as express.Request & { file?: Express.Multer.File }).file;
    if (!file) {
      return res.status(400).json({ error: 'Dosya yüklenmedi' });
    }

    // Magic byte doğrulaması
    const ext = path.extname(file.originalname).toLowerCase();
    if (!validateMagicBytes(file.path, ext)) {
      // Sahte dosyayı sil
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Dosya içeriği, dosya uzantısı ile uyuşmuyor. Dosya reddedildi.' });
    }

    // Dosya URL'ini döndür
    const fileUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/uploads/${file.filename}`;
    res.json({ url: fileUrl, filename: file.filename });
  } catch (error) {
    logger.error('File upload error', { error });
    res.status(500).json({ error: 'Dosya yüklenemedi' });
  }
});



// Prometheus metrics endpoint
app.get("/metrics", async (_req: express.Request, res: express.Response) => {
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
app.get("/health", async (_req: express.Request, res: express.Response) => {
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
app.get("/", (_req: express.Request, res: express.Response) => {
  res.send("Backend çalışıyor!");
});

// test-mail endpoint removed for security — was an unauthenticated email relay

// Setup Swagger documentation
setupSwagger(app);

// Setup GraphQL server (BFF layer)
if (process.env.ENABLE_GRAPHQL === 'true' || process.env.NODE_ENV !== 'production') {
  import('./graphql/server')
    .then(({ createApolloServer }) => {
      const apolloServer = createApolloServer();
      apolloServer.start().then(() => {
        apolloServer.applyMiddleware({ app, path: '/graphql' });
        logger.info(`GraphQL server ready at http://localhost:${PORT}${apolloServer.graphqlPath}`);
      });
    })
    .catch((err) => {
      // GraphQL is optional in local dev; log and continue if dependencies are missing
      logger.warn('GraphQL server could not be initialized (optional in dev)', { error: err.message });
    });
}

// 404 handler
app.use('*', (_req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Endpoint bulunamadı' });
});

// Global error handler
app.use(globalErrorHandler);

// Sunucu başlat
const PORT = process.env.PORT || 3001;

// Export app for testing
export { app };

if (process.env.NODE_ENV !== 'test') {
  connectDB()
    .then(async () => {
      const server = app.listen(PORT, async () => {
        logger.info(`🚀 Server started successfully`, {
          port: PORT,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString(),
        });

        logger.info(`Server running on http://localhost:${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`Security middleware active`);
        logger.info(`Compression enabled`);
        logger.info(`Logging enabled`);
        logger.info(`Monitoring enabled - Status: http://localhost:${PORT}/status`);
        logger.info(`Swagger API Docs: http://localhost:${PORT}/api-docs`);
        logger.info(`API Info: http://localhost:${PORT}/api-docs-info`);
        logger.info(`Health Check: http://localhost:${PORT}/health`);

        // Initialize WebSocket for real-time notifications
        initializeWebSocket(server);
        logger.info(`WebSocket notifications enabled`);

        // Initialize event-driven architecture
        const { initializeEventDrivenWebSocket } = await import('./utils/websocket-enhanced');
        initializeEventDrivenWebSocket();
        logger.info(`Event-driven architecture enabled`);

        // Migrate existing evci requests (one-time, idempotent)
        migrateEvciRequests()
          .then(() => logger.info('EvciRequest migration completed'))
          .catch((err) => logger.error('EvciRequest migration failed', { error: err.message }));

        // Initialize scheduler for cron jobs (evci reminders etc.)
        SchedulerService.initialize();
        logger.info(`Scheduler service initialized`);
      });
    })
    .catch((err) => {
      logger.error("MongoDB connection failed", { error: err.message });
      process.exit(1);
    });
}
