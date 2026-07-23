/**
 * Migration: Homework kayıtlarına academicYear damgası
 *
 * `academicYear` alanı Homework modeline sonradan eklendi. Mevcut kayıtlarda
 * alan yok; okuma filtreleri içinde bulunulan yıla göre süzdüğü için
 * damgalanmayan kayıtlar hiçbir listede görünmezdi. Bu migration onları
 * çalıştığı andaki öğretim yılıyla damgalar.
 *
 * Schedule ve Note kapsam dışı — her ikisi de alanı zaten taşıyor.
 */

import { Homework } from '../models/Homework';
import { getAcademicYear } from '../utils/academicYear';
import logger from '../utils/logger';

export interface Migration {
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

const migration: Migration = {
  name: '004-backfill-homework-academic-year',

  async up() {
    const academicYear = getAcademicYear();
    logger.info(`Running migration: 004-backfill-homework-academic-year (up) -> ${academicYear}`);

    // Şema artık alanı required yaptığı için Mongoose katmanı yerine
    // doğrudan koleksiyon kullanılır.
    const result = await Homework.collection.updateMany(
      { academicYear: { $exists: false } },
      { $set: { academicYear } },
    );
    logger.info(`✅ Backfilled ${result.modifiedCount} homework record(s)`);
  },

  async down() {
    logger.info('Running migration: 004-backfill-homework-academic-year (down)');
    const result = await Homework.collection.updateMany({}, { $unset: { academicYear: '' } });
    logger.info(`✅ Removed academicYear from ${result.modifiedCount} homework record(s)`);
  },
};

export default migration;
