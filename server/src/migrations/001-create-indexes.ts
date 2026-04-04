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

    const safeCreateIndex = async (collection: any, spec: any, options: any) => {
      try {
        await collection.createIndex(spec, options);
      } catch (error: any) {
        // Skip if index already exists (code 85 = IndexOptionsConflict, code 86 = IndexKeySpecsConflict)
        if (error.code === 85 || error.code === 86) {
          console.log(`⏭️  Index ${options.name} already exists, skipping`);
        } else {
          throw error;
        }
      }
    };

    try {
      // User collection indexes
      await safeCreateIndex(User.collection, { id: 1 }, { unique: true, name: 'id_unique' });
      await safeCreateIndex(
        User.collection,
        { email: 1 },
        { unique: true, sparse: true, name: 'email_unique' },
      );
      await safeCreateIndex(User.collection, { rol: 1 }, { name: 'rol_index' });
      await safeCreateIndex(User.collection, { sinif: 1, sube: 1 }, { name: 'sinif_sube_index' });
      await safeCreateIndex(User.collection, { isActive: 1 }, { name: 'isActive_index' });
      await safeCreateIndex(User.collection, { createdAt: -1 }, { name: 'createdAt_index' });

      // tcknHash index for encrypted TCKN lookups (unique, sparse for users without TCKN)
      await safeCreateIndex(
        User.collection,
        { tcknHash: 1 },
        { unique: true, sparse: true, name: 'tcknHash_unique' },
      );

      // parentId index for parent-child relationship queries
      await safeCreateIndex(
        User.collection,
        { parentId: 1 },
        { sparse: true, name: 'parentId_index' },
      );

      // Text index on adSoyad for name search
      await safeCreateIndex(
        User.collection,
        { adSoyad: 'text' },
        { name: 'adSoyad_text', default_language: 'turkish' },
      );

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
      await User.collection.dropIndex('tcknHash_unique');
      await User.collection.dropIndex('parentId_index');
      await User.collection.dropIndex('adSoyad_text');

      console.log('✅ Indexes dropped successfully');
    } catch (error) {
      console.error('❌ Error dropping indexes:', error);
      throw error;
    }
  },
};

export default migration;
