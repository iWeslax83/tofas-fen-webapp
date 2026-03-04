import mongoose from "mongoose";
import logger from "./utils/logger";

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/tofas-fen";

// Enhanced database connection configuration for production performance
const dbConfig: mongoose.ConnectOptions = {
  maxPoolSize: process.env.NODE_ENV === 'production' ? 50 : 20, // Higher for production
  minPoolSize: process.env.NODE_ENV === 'production' ? 10 : 5, // Higher for production
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  bufferCommands: true,
  maxIdleTimeMS: 60000,
  connectTimeoutMS: 30000,
  heartbeatFrequencyMS: 15000,
  retryWrites: true,
  retryReads: true,
  w: process.env.NODE_ENV === 'production' ? 'majority' : 1, // Majority for production
  journal: process.env.NODE_ENV === 'production', // Enable journal for production
  readPreference: 'primary',
  readConcern: { level: 'local' } as any,
  monitorCommands: process.env.NODE_ENV === 'development',
  tls: process.env.NODE_ENV === 'production',
  tlsAllowInvalidCertificates: process.env.NODE_ENV !== 'production',
  ...(process.env.NODE_ENV === 'production' && { authSource: process.env.MONGODB_AUTH_SOURCE || 'admin' }),
  ...(process.env.MONGODB_REPLICA_SET && { replicaSet: process.env.MONGODB_REPLICA_SET }),
  writeConcern: {
    w: process.env.NODE_ENV === 'production' ? 'majority' : 1,
    journal: process.env.NODE_ENV === 'production',
    wtimeout: 15000
  },
  // Index creation options
  autoIndex: process.env.NODE_ENV !== 'production', // Disable in production for performance
  autoCreate: true // Automatically create collections
};

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, dbConfig);
    logger.info('MongoDB connection established');
  } catch (error) {
    logger.error('MongoDB connection failed', { error: error instanceof Error ? error.message : error });
    throw error;
  }
}

// Enhanced database connection event handlers
mongoose.connection.on('connected', () => {
  logger.info('MongoDB connected successfully');

  // Safely access pool and connection properties
  try {
    if ((mongoose.connection as any).pool) {
      const pool = (mongoose.connection as any).pool;
      logger.info(`Connection pool size: ${pool.size}`);
    }
    if (mongoose.connection.name) {
      logger.info(`Database: ${mongoose.connection.name}`);
    }
    if (mongoose.connection.host) {
      logger.info(`Host: ${mongoose.connection.host}`);
    }
    if (mongoose.connection.port) {
      logger.info(`Port: ${mongoose.connection.port}`);
    }
  } catch (error) {
    logger.info('Connection details not yet available');
  }
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error', { error: err instanceof Error ? err.message : err });
  logger.error('Error details', {
    name: err.name,
    message: err.message,
    code: err.code,
    codeName: err.codeName
  });

  // Attempt to reconnect on error
  setTimeout(() => {
    if (mongoose.connection.readyState === 0) { // disconnected
      logger.info('Attempting to reconnect after error...');
      connectDB().catch(reconnectErr => {
        logger.error('Reconnection failed', { error: reconnectErr instanceof Error ? reconnectErr.message : reconnectErr });
      });
    }
  }, 5000); // Wait 5 seconds before reconnecting
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
  logger.info('Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected successfully');
});

mongoose.connection.on('close', () => {
  logger.info('MongoDB connection closed');
});

// Connection pool monitoring
mongoose.connection.on('poolCreated', (event) => {
  try {
    logger.info('Connection pool created', {
      size: event?.size || 'unknown',
      maxSize: event?.maxSize || 'unknown'
    });
  } catch (error) {
    logger.info('Connection pool created');
  }
});

mongoose.connection.on('poolReady', (event) => {
  try {
    logger.info('Connection pool ready', {
      size: event?.size || 'unknown',
      maxSize: event?.maxSize || 'unknown'
    });
  } catch (error) {
    logger.info('Connection pool ready');
  }
});

mongoose.connection.on('poolCleared', (event) => {
  try {
    logger.info('Connection pool cleared', {
      size: event?.size || 'unknown',
      maxSize: event?.maxSize || 'unknown'
    });
  } catch (error) {
    logger.info('Connection pool cleared');
  }
});

// Performance monitoring
let lastQueryTime = Date.now();
let queryCount = 0;

mongoose.connection.on('query', () => {
  queryCount++;
  const now = Date.now();
  const timeSinceLastQuery = now - lastQueryTime;
  
  if (timeSinceLastQuery > 1000) { // Log every second
    logger.info(`Database queries: ${queryCount} in ${timeSinceLastQuery}ms`);
    queryCount = 0;
    lastQueryTime = now;
  }
});

// Graceful shutdown with enhanced error handling
process.on('SIGINT', async () => {
  try {
    logger.info('Shutting down gracefully...');

    // Close all connections in the pool
    await mongoose.connection.close();
    logger.info('MongoDB connection closed through app termination');
    
    // Force exit after cleanup
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error instanceof Error ? error.message : error });
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  try {
    logger.info('Received SIGTERM, shutting down gracefully...');

    // Close all connections in the pool
    await mongoose.connection.close();
    logger.info('MongoDB connection closed through SIGTERM');
    
    // Force exit after cleanup
    process.exit(0);
  } catch (error) {
    logger.error('Error during SIGTERM shutdown', { error: error instanceof Error ? error.message : error });
    process.exit(1);
  }
});

// Enhanced error handling for uncaught exceptions
process.on('uncaughtException', async (error) => {
  logger.error('Uncaught Exception', { error: error instanceof Error ? error.message : error });

  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed due to uncaught exception');
  } catch (closeError) {
    logger.error('Error closing MongoDB connection', { error: closeError instanceof Error ? closeError.message : closeError });
  }
  
  // Don't exit in test environment
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});

process.on('unhandledRejection', async (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });

  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed due to unhandled rejection');
  } catch (closeError) {
    logger.error('Error closing MongoDB connection', { error: closeError instanceof Error ? closeError.message : closeError });
  }
  
  // Don't exit in test environment
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});

// Database health check function
export async function checkDBHealth() {
  try {
    const startTime = Date.now();
    
    // Ping the database
    await mongoose.connection.db.admin().ping();
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      responseTime,
      connectionState: mongoose.connection.readyState,
      poolSize: (mongoose.connection as any).pool?.size,
      maxPoolSize: (mongoose.connection as any).pool?.maxSize,
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
      connectionState: mongoose.connection.readyState,
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port
    };
  }
}

// Database statistics function
export async function getDBStats() {
  try {
    const stats = await mongoose.connection.db.stats();
    
    return {
      collections: stats.collections,
      views: stats.views,
      objects: stats.objects,
      avgObjSize: stats.avgObjSize,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize,
      indexes: stats.indexes,
      indexSize: stats.indexSize,
      totalSize: stats.totalSize,
      scaleFactor: stats.scaleFactor,
      fsUsedSize: stats.fsUsedSize,
      fsTotalSize: stats.fsTotalSize
    };
  } catch (error) {
    logger.error('Error getting database stats', { error: error instanceof Error ? error.message : error });
    return null;
  }
}

// Connection pool management
export function getConnectionPoolInfo() {
  const pool = (mongoose.connection as any).pool || {};
  
  return {
    size: pool.size,
    maxSize: pool.maxSize,
    minSize: pool.minSize,
    available: pool.available,
    pending: pool.pending,
    created: pool.created,
    destroyed: pool.destroyed
  };
}

// Close database connection (for testing)
export async function closeDB() {
  try {
    await mongoose.connection.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection', { error: error instanceof Error ? error.message : error });
    throw error;
  }
}

// Export connection for testing
export { mongoose }; 