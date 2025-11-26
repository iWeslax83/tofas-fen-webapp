import mongoose from "mongoose";

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
    console.log('✅ MongoDB connection established');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

// Enhanced database connection event handlers
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected successfully');
  
  // Safely access pool and connection properties
  try {
    if ((mongoose.connection as any).pool) {
      const pool = (mongoose.connection as any).pool;
      console.log(`📊 Connection pool size: ${pool.size}`);
    }
    if (mongoose.connection.name) {
      console.log(`🔗 Database: ${mongoose.connection.name}`);
    }
    if (mongoose.connection.host) {
      console.log(`🌐 Host: ${mongoose.connection.host}`);
    }
    if (mongoose.connection.port) {
      console.log(`🚪 Port: ${mongoose.connection.port}`);
    }
  } catch (error) {
    console.log('ℹ️ Connection details not yet available');
  }
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
  console.error('🔍 Error details:', {
    name: err.name,
    message: err.message,
    code: err.code,
    codeName: err.codeName
  });
  
  // Attempt to reconnect on error
  setTimeout(() => {
    if (mongoose.connection.readyState === 0) { // disconnected
      console.log('🔄 Attempting to reconnect after error...');
      connectDB().catch(reconnectErr => {
        console.error('❌ Reconnection failed:', reconnectErr.message);
      });
    }
  }, 5000); // Wait 5 seconds before reconnecting
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
  console.log('🔄 Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected successfully');
});

mongoose.connection.on('close', () => {
  console.log('🔒 MongoDB connection closed');
});

// Connection pool monitoring
mongoose.connection.on('poolCreated', (event) => {
  try {
    console.log('🏊 Connection pool created:', {
      size: event?.size || 'unknown',
      maxSize: event?.maxSize || 'unknown'
    });
  } catch (error) {
    console.log('🏊 Connection pool created');
  }
});

mongoose.connection.on('poolReady', (event) => {
  try {
    console.log('✅ Connection pool ready:', {
      size: event?.size || 'unknown',
      maxSize: event?.maxSize || 'unknown'
    });
  } catch (error) {
    console.log('✅ Connection pool ready');
  }
});

mongoose.connection.on('poolCleared', (event) => {
  try {
    console.log('🧹 Connection pool cleared:', {
      size: event?.size || 'unknown',
      maxSize: event?.maxSize || 'unknown'
    });
  } catch (error) {
    console.log('🧹 Connection pool cleared');
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
    console.log(`📊 Database queries: ${queryCount} in ${timeSinceLastQuery}ms`);
    queryCount = 0;
    lastQueryTime = now;
  }
});

// Graceful shutdown with enhanced error handling
process.on('SIGINT', async () => {
  try {
    console.log('🔄 Shutting down gracefully...');
    
    // Close all connections in the pool
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed through app termination');
    
    // Force exit after cleanup
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  try {
    console.log('🔄 Received SIGTERM, shutting down gracefully...');
    
    // Close all connections in the pool
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed through SIGTERM');
    
    // Force exit after cleanup
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during SIGTERM shutdown:', error);
    process.exit(1);
  }
});

// Enhanced error handling for uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('💥 Uncaught Exception:', error);
  
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed due to uncaught exception');
  } catch (closeError) {
    console.error('❌ Error closing MongoDB connection:', closeError);
  }
  
  // Don't exit in test environment
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('🚫 Unhandled Rejection at:', promise, 'reason:', reason);
  
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed due to unhandled rejection');
  } catch (closeError) {
    console.error('❌ Error closing MongoDB connection:', closeError);
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
    console.error('Error getting database stats:', error);
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
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
    throw error;
  }
}

// Export connection for testing
export { mongoose }; 