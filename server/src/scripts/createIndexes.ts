import mongoose from 'mongoose';
import { connectDB } from '../db';
import { User } from '../models/User';
import { EvciRequest } from '../models/EvciRequest';

/**
 * Create database indexes for optimal performance
 * This script should be run after deployment to ensure all indexes are created
 */
async function createIndexes() {
  try {
    console.log('🔗 Connecting to database...');
    await connectDB();

    console.log('📊 Creating indexes...');

    // User collection indexes
    console.log('👤 Creating User indexes...');
    await User.collection.createIndexes([]);

    // EvciRequest collection indexes
    console.log('📝 Creating EvciRequest indexes...');
    await EvciRequest.collection.createIndexes([]);

    // List all indexes for verification
    console.log('\n📋 Index Summary:');

    const userIndexes = await User.collection.listIndexes().toArray();
    console.log(`👤 User collection: ${userIndexes.length} indexes`);
    userIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    const evciIndexes = await EvciRequest.collection.listIndexes().toArray();
    console.log(`📝 EvciRequest collection: ${evciIndexes.length} indexes`);
    evciIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n✅ All indexes created successfully!');

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  createIndexes();
}

export { createIndexes };

