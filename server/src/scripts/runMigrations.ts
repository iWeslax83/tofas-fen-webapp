/**
 * Migration Runner
 * Executes database migrations in order
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { connectDB } from '../db';

interface MigrationRecord {
  name: string;
  executedAt: Date;
}

const MIGRATIONS_COLLECTION = 'migrations';

/**
 * Get migration execution history
 */
async function getMigrationHistory(): Promise<string[]> {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      return [];
    }
    
    const collection = db.collection(MIGRATIONS_COLLECTION);
    const records = await collection.find({}).sort({ executedAt: 1 }).toArray();
    return records.map((r) => (r as unknown as MigrationRecord).name);
  } catch (error) {
    // Collection doesn't exist yet, return empty array
    return [];
  }
}

/**
 * Mark migration as executed
 */
async function markMigrationExecuted(name: string) {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not available');
  }
  
  const collection = db.collection(MIGRATIONS_COLLECTION);
  await collection.insertOne({
    name,
    executedAt: new Date()
  });
}

/**
 * Load migration file
 */
async function loadMigration(migrationName: string) {
  const migrationPath = path.join(__dirname, '../migrations', `${migrationName}.ts`);
  
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${migrationPath}`);
  }
  
  // Dynamic import
  const migration = await import(migrationPath);
  return migration.default || migration;
}

/**
 * Run migrations
 */
export async function runMigrations(direction: 'up' | 'down' = 'up') {
  try {
    console.log('Connecting to database...');
    await connectDB();
    
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.ts') && file !== 'index.ts')
      .sort();
    
    console.log(`Found ${files.length} migration(s)`);
    
    const executedMigrations = await getMigrationHistory();
    
    for (const file of files) {
      const migrationName = path.basename(file, '.ts');
      
      if (direction === 'up') {
        // Skip if already executed
        if (executedMigrations.includes(migrationName)) {
          console.log(`⏭️  Skipping ${migrationName} (already executed)`);
          continue;
        }
        
        console.log(`🔄 Running migration: ${migrationName}`);
        const migration = await loadMigration(migrationName);
        await migration.up();
        await markMigrationExecuted(migrationName);
        console.log(`✅ Migration ${migrationName} completed`);
      } else {
        // Only run down if migration was executed
        if (!executedMigrations.includes(migrationName)) {
          console.log(`⏭️  Skipping ${migrationName} (not executed)`);
          continue;
        }
        
        console.log(`🔄 Rolling back migration: ${migrationName}`);
        const migration = await loadMigration(migrationName);
        await migration.down();
        
        // Remove from history
        const db = mongoose.connection.db;
        if (db) {
          const collection = db.collection(MIGRATIONS_COLLECTION);
          await collection.deleteOne({ name: migrationName });
        }
        
        console.log(`✅ Migration ${migrationName} rolled back`);
      }
    }
    
    console.log('✅ All migrations completed');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  
  runMigrations(direction)
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

export default runMigrations;

