import mongoose from 'mongoose'

async function healthCheck() {
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.error('Database not connected')
      process.exit(1)
    }

    // Check if we can perform a simple database operation
    await mongoose.connection.db.admin().ping()

    console.log('Health check passed')
    process.exit(0)
  } catch (error) {
    console.error('Health check failed:', error)
    process.exit(1)
  }
}

healthCheck()