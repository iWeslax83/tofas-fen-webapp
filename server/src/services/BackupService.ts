import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS || '7', 10);

export class BackupService {
  /**
   * MongoDB veritabanı yedeği al (mongodump kullanır).
   * Eğer mongodump yoksa, mongoexport ile koleksiyon bazlı JSON yedek alır.
   */
  static async createBackup(): Promise<{ success: boolean; path?: string; error?: string; method?: string }> {
    // Backup dizinini oluştur
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tofas-fen';

    // mongodump ile yedek al
    try {
      const result = await BackupService.runMongodump(mongoUri, backupPath);
      await BackupService.cleanOldBackups();
      return result;
    } catch {
      logger.warn('mongodump not available, falling back to mongoose export');
    }

    // Fallback: Mongoose ile JSON export
    try {
      const result = await BackupService.runMongooseExport(backupPath);
      await BackupService.cleanOldBackups();
      return result;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('Backup failed', { error: errMsg });
      return { success: false, error: errMsg };
    }
  }

  private static runMongodump(mongoUri: string, backupPath: string): Promise<{ success: boolean; path: string; method: string }> {
    return new Promise((resolve, reject) => {
      const cmd = `mongodump --uri="${mongoUri}" --out="${backupPath}" --gzip`;

      exec(cmd, { timeout: 120000 }, (error, _stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        if (stderr && !stderr.includes('done dumping')) {
          logger.warn('mongodump stderr', { stderr });
        }

        logger.info('Database backup created via mongodump', { path: backupPath });
        resolve({ success: true, path: backupPath, method: 'mongodump' });
      });
    });
  }

  private static async runMongooseExport(backupPath: string): Promise<{ success: boolean; path: string; method: string }> {
    const mongoose = (await import('mongoose')).default;
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error('Database connection not available');
    }

    fs.mkdirSync(backupPath, { recursive: true });

    const collections = await db.listCollections().toArray();
    const exportedCollections: string[] = [];

    for (const col of collections) {
      try {
        const data = await db.collection(col.name).find({}).toArray();
        const filePath = path.join(backupPath, `${col.name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        exportedCollections.push(col.name);
      } catch (error) {
        logger.warn(`Failed to export collection ${col.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Meta dosyası
    const meta = {
      timestamp: new Date().toISOString(),
      collections: exportedCollections,
      method: 'mongoose-export',
      database: mongoose.connection.name,
    };
    fs.writeFileSync(path.join(backupPath, '_meta.json'), JSON.stringify(meta, null, 2));

    logger.info('Database backup created via mongoose export', {
      path: backupPath,
      collections: exportedCollections.length,
    });

    return { success: true, path: backupPath, method: 'mongoose-export' };
  }

  /**
   * Eski yedekleri temizle (MAX_BACKUPS kadar tut).
   */
  static async cleanOldBackups(): Promise<number> {
    if (!fs.existsSync(BACKUP_DIR)) return 0;

    const entries = fs.readdirSync(BACKUP_DIR)
      .filter(e => e.startsWith('backup-'))
      .map(name => ({
        name,
        path: path.join(BACKUP_DIR, name),
        time: fs.statSync(path.join(BACKUP_DIR, name)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time); // en yeni önce

    let deleted = 0;
    for (let i = MAX_BACKUPS; i < entries.length; i++) {
      try {
        fs.rmSync(entries[i].path, { recursive: true, force: true });
        deleted++;
        logger.info('Old backup deleted', { path: entries[i].path });
      } catch (error) {
        logger.warn('Failed to delete old backup', {
          path: entries[i].path,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return deleted;
  }

  /**
   * Mevcut yedekleri listele.
   */
  static listBackups(): Array<{ name: string; date: string; size: number }> {
    if (!fs.existsSync(BACKUP_DIR)) return [];

    return fs.readdirSync(BACKUP_DIR)
      .filter(e => e.startsWith('backup-'))
      .map(name => {
        const fullPath = path.join(BACKUP_DIR, name);
        const stat = fs.statSync(fullPath);
        return {
          name,
          date: stat.mtime.toISOString(),
          size: BackupService.getDirSize(fullPath),
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private static getDirSize(dirPath: string): number {
    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) return stat.size;

    let size = 0;
    for (const entry of fs.readdirSync(dirPath)) {
      size += BackupService.getDirSize(path.join(dirPath, entry));
    }
    return size;
  }

  /**
   * Verify a backup is valid and restorable.
   * Checks file integrity and basic structure.
   */
  static async verifyBackup(backupName?: string): Promise<{
    valid: boolean;
    backupName: string;
    details: {
      exists: boolean;
      hasMetaFile: boolean;
      collections: string[];
      totalSize: number;
      fileCount: number;
      errors: string[];
    };
  }> {
    // Use the latest backup if no name specified
    const backups = BackupService.listBackups();
    if (backups.length === 0) {
      return {
        valid: false,
        backupName: backupName || 'none',
        details: {
          exists: false,
          hasMetaFile: false,
          collections: [],
          totalSize: 0,
          fileCount: 0,
          errors: ['No backups found'],
        },
      };
    }

    const targetBackup = backupName
      ? backups.find(b => b.name === backupName)
      : backups[0]; // Latest

    if (!targetBackup) {
      return {
        valid: false,
        backupName: backupName || 'unknown',
        details: {
          exists: false,
          hasMetaFile: false,
          collections: [],
          totalSize: 0,
          fileCount: 0,
          errors: [`Backup "${backupName}" not found`],
        },
      };
    }

    const backupPath = path.join(BACKUP_DIR, targetBackup.name);
    const errors: string[] = [];
    let hasMetaFile = false;
    const collections: string[] = [];
    let fileCount = 0;

    try {
      const entries = fs.readdirSync(backupPath);
      fileCount = entries.length;

      if (fileCount === 0) {
        errors.push('Backup directory is empty');
      }

      // Check for meta file (mongoose export)
      if (entries.includes('_meta.json')) {
        hasMetaFile = true;
        try {
          const metaContent = fs.readFileSync(path.join(backupPath, '_meta.json'), 'utf-8');
          const meta = JSON.parse(metaContent);
          if (meta.collections) {
            collections.push(...meta.collections);
          }
        } catch (e) {
          errors.push('Meta file is corrupted or invalid JSON');
        }
      }

      // Verify each JSON file is valid
      for (const entry of entries) {
        if (entry.endsWith('.json') && entry !== '_meta.json') {
          const collName = entry.replace('.json', '');
          if (!collections.includes(collName)) {
            collections.push(collName);
          }

          try {
            const content = fs.readFileSync(path.join(backupPath, entry), 'utf-8');
            const data = JSON.parse(content);
            if (!Array.isArray(data)) {
              errors.push(`${entry}: Expected array, got ${typeof data}`);
            } else if (data.length === 0) {
              // Empty collection is valid but noteworthy
              logger.info(`Backup verification: ${entry} has 0 documents`);
            }
          } catch (e) {
            errors.push(`${entry}: Invalid JSON - ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }

      // Verify minimum expected collections
      const expectedCollections = ['users'];
      for (const expected of expectedCollections) {
        if (!collections.includes(expected)) {
          errors.push(`Missing expected collection: ${expected}`);
        }
      }
    } catch (e) {
      errors.push(`Cannot read backup directory: ${e instanceof Error ? e.message : String(e)}`);
    }

    const valid = errors.length === 0 && fileCount > 0;

    logger.info('Backup verification completed', {
      backupName: targetBackup.name,
      valid,
      collections: collections.length,
      errors: errors.length,
    });

    return {
      valid,
      backupName: targetBackup.name,
      details: {
        exists: true,
        hasMetaFile,
        collections,
        totalSize: targetBackup.size,
        fileCount,
        errors,
      },
    };
  }

  /**
   * Create a backup and immediately verify it.
   * Returns both backup result and verification result.
   */
  static async createAndVerifyBackup(): Promise<{
    backup: { success: boolean; path?: string; error?: string; method?: string };
    verification: {
      valid: boolean;
      backupName: string;
      details: any;
    } | null;
  }> {
    const backup = await BackupService.createBackup();

    if (!backup.success || !backup.path) {
      return { backup, verification: null };
    }

    // Extract backup name from path
    const backupName = path.basename(backup.path);
    const verification = await BackupService.verifyBackup(backupName);

    if (!verification.valid) {
      logger.error('Backup verification FAILED after creation', {
        backupName,
        errors: verification.details.errors,
      });
    } else {
      logger.info('Backup created and verified successfully', { backupName });
    }

    return { backup, verification };
  }
}
