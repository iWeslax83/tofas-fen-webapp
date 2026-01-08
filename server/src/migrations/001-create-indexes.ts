/**
 * Migration: Create Database Indexes
 * This migration creates essential indexes for performance optimization
 */

import mongoose from 'mongoose';
import { User } from '../models/User';

export interface Migration {
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

const migration: Migration = {
  name: '001-create-indexes',
  
  async up() {
    console.log('Running migration: 001-create-indexes (up)');
    
    try {
      // User collection indexes
      await User.collection.createIndex({ id: 1 }, { unique: true, name: 'id_unique' });
      await User.collection.createIndex({ email: 1 }, { unique: true, sparse: true, name: 'email_unique' });
      await User.collection.createIndex({ rol: 1 }, { name: 'rol_index' });
      await User.collection.createIndex({ sinif: 1, sube: 1 }, { name: 'sinif_sube_index' });
      await User.collection.createIndex({ isActive: 1 }, { name: 'isActive_index' });
      await User.collection.createIndex({ createdAt: -1 }, { name: 'createdAt_index' });
      
      console.log('✅ Indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
      throw error;
    }
  },
  
  async down() {
    console.log('Running migration: 001-create-indexes (down)');
    
    try {
      // Drop indexes
      await User.collection.dropIndex('id_unique');
      await User.collection.dropIndex('email_unique');
      await User.collection.dropIndex('rol_index');
      await User.collection.dropIndex('sinif_sube_index');
      await User.collection.dropIndex('isActive_index');
      await User.collection.dropIndex('createdAt_index');
      
      console.log('✅ Indexes dropped successfully');
    } catch (error) {
      console.error('❌ Error dropping indexes:', error);
      throw error;
    }
  }
};

export default migration;

