import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { Request, Response } from 'express';

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
  winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
);

// Dosya formatı (JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const logsDir = path.join('logs');

// Daily rotate transport options
const dailyRotateDefaults = {
  dirname: logsDir,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: fileFormat,
};

// Transport'lar
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format,
    level: process.env.LOG_LEVEL || 'info',
  }),

  // Error log - daily rotation
  new DailyRotateFile({
    ...dailyRotateDefaults,
    filename: 'error-%DATE%.log',
    level: 'error',
  }),

  // Combined log - daily rotation
  new DailyRotateFile({
    ...dailyRotateDefaults,
    filename: 'combined-%DATE%.log',
  }),

  // HTTP request log - daily rotation
  new DailyRotateFile({
    ...dailyRotateDefaults,
    filename: 'http-%DATE%.log',
    level: 'http',
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

export const logRequest = (req: Request, res: Response, responseTime: number) => {
  logger.http({
    method: req.method,
    url: req.url,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as unknown as Record<string, unknown>).session
      ? ((req as unknown as Record<string, unknown>).session as Record<string, unknown>)?.userId ||
        'anonymous'
      : 'anonymous',
  } as unknown as string);
};

export const logDatabase = (operation: string, collection: string, duration: number) => {
  logger.info({
    type: 'database',
    operation,
    collection,
    duration: `${duration}ms`,
  } as unknown as string);
};

export const logCache = (operation: string, key: string, hit: boolean) => {
  logger.debug({
    type: 'cache',
    operation,
    key,
    hit,
  } as unknown as string);
};

export const logSecurity = (event: string, details: Record<string, unknown>) => {
  logger.warn({
    type: 'security',
    event,
    details,
    ip: details.ip,
    userId: details.userId,
  } as unknown as string);
};

export default logger;
