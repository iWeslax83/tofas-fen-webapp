import winston from 'winston';
import path from 'path';

// Log seviyeleri
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Renkler
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Log formatı
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Dosya formatı (JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Transport'lar
const transports = [
  // Console transport
  new winston.transports.Console({
    format,
    level: process.env.LOG_LEVEL || 'info',
  }),
  
  // Error log dosyası
  new winston.transports.File({
    filename: path.join('logs', 'error.log'),
    level: 'error',
    format: fileFormat,
  }),
  
  // Combined log dosyası
  new winston.transports.File({
    filename: path.join('logs', 'combined.log'),
    format: fileFormat,
  }),
  
  // HTTP request log dosyası
  new winston.transports.File({
    filename: path.join('logs', 'http.log'),
    level: 'http',
    format: fileFormat,
  }),
];

// Logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: fileFormat,
  transports,
  exitOnError: false,
});

// Morgan stream için
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Özel log fonksiyonları
export const logError = (error: Error, context?: string) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
};

export const logRequest = (req: any, res: any, responseTime: number) => {
  logger.http({
    method: req.method,
    url: req.url,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.session?.userId || 'anonymous',
  });
};

export const logDatabase = (operation: string, collection: string, duration: number) => {
  logger.info({
    type: 'database',
    operation,
    collection,
    duration: `${duration}ms`,
  });
};

export const logCache = (operation: string, key: string, hit: boolean) => {
  logger.debug({
    type: 'cache',
    operation,
    key,
    hit,
  });
};

export const logSecurity = (event: string, details: any) => {
  logger.warn({
    type: 'security',
    event,
    details,
    ip: details.ip,
    userId: details.userId,
  });
};

export default logger; 