/**
 * Migration: Add Missing Database Indexes
 * This migration creates indexes for 6 collections that are currently missing them
 */

import mongoose from 'mongoose';
import logger from '../utils/logger';

export interface Migration {
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

const migration: Migration = {
  name: '002-add-missing-indexes',

  async up() {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');

    logger.info('Migration 002: Creating missing indexes...');

    try {
      // Announcement indexes
      const announcements = db.collection('announcements');
      await announcements.createIndex(
        { targetRoles: 1, createdAt: -1 },
        { name: 'targetRoles_createdAt_idx' },
      );
      await announcements.createIndex(
        { authorId: 1, createdAt: -1 },
        { name: 'authorId_createdAt_idx' },
      );
      await announcements.createIndex(
        { priority: 1, createdAt: -1 },
        { name: 'priority_createdAt_idx' },
      );

      // Homework indexes
      const homework = db.collection('homeworks');
      await homework.createIndex(
        { teacherId: 1, isPublished: 1 },
        { name: 'teacherId_isPublished_idx' },
      );
      await homework.createIndex(
        { classLevel: 1, classSection: 1, dueDate: 1 },
        { name: 'class_dueDate_idx' },
      );
      await homework.createIndex({ dueDate: 1, status: 1 }, { name: 'dueDate_status_idx' });

      // Schedule indexes
      const schedules = db.collection('schedules');
      await schedules.createIndex(
        { classLevel: 1, classSection: 1, academicYear: 1 },
        { name: 'class_academicYear_idx' },
      );
      await schedules.createIndex({ isActive: 1 }, { name: 'isActive_idx' });

      // MealList indexes
      const meallists = db.collection('meallists');
      await meallists.createIndex({ month: 1, year: 1 }, { name: 'month_year_idx' });
      await meallists.createIndex(
        { isActive: 1, uploadedAt: -1 },
        { name: 'isActive_uploadedAt_idx' },
      );

      // SupervisorList indexes
      const supervisorlists = db.collection('supervisorlists');
      await supervisorlists.createIndex({ month: 1, year: 1 }, { name: 'month_year_idx' });
      await supervisorlists.createIndex(
        { isActive: 1, uploadedAt: -1 },
        { name: 'isActive_uploadedAt_idx' },
      );

      // Request indexes
      const requests = db.collection('requests');
      await requests.createIndex({ userId: 1, status: 1 }, { name: 'userId_status_idx' });
      await requests.createIndex(
        { type: 1, status: 1, createdAt: -1 },
        { name: 'type_status_createdAt_idx' },
      );

      logger.info('Migration 002: All indexes created successfully');
    } catch (error) {
      logger.error('Migration 002: Error creating indexes', error);
      throw error;
    }
  },

  async down() {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');

    logger.info('Migration 002: Dropping indexes...');

    try {
      const drops: Array<[string, string]> = [
        ['announcements', 'targetRoles_createdAt_idx'],
        ['announcements', 'authorId_createdAt_idx'],
        ['announcements', 'priority_createdAt_idx'],
        ['homeworks', 'teacherId_isPublished_idx'],
        ['homeworks', 'class_dueDate_idx'],
        ['homeworks', 'dueDate_status_idx'],
        ['schedules', 'class_academicYear_idx'],
        ['schedules', 'isActive_idx'],
        ['meallists', 'month_year_idx'],
        ['meallists', 'isActive_uploadedAt_idx'],
        ['supervisorlists', 'month_year_idx'],
        ['supervisorlists', 'isActive_uploadedAt_idx'],
        ['requests', 'userId_status_idx'],
        ['requests', 'type_status_createdAt_idx'],
      ];

      for (const [collection, indexName] of drops) {
        try {
          await db.collection(collection).dropIndex(indexName);
        } catch (error) {
          logger.warn(`Index ${indexName} on ${collection} may not exist, skipping`);
        }
      }

      logger.info('Migration 002: Indexes dropped');
    } catch (error) {
      logger.error('Migration 002: Error dropping indexes', error);
      throw error;
    }
  },
};

export default migration;
