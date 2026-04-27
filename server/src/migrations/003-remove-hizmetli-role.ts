/**
 * Migration: Remove hizmetli role
 *
 * Drops every user with `rol === 'hizmetli'` from the users collection.
 * This is irreversible — the down() step is intentionally a no-op
 * because the user records (TCKN, email, audit history) are not
 * recoverable once removed.
 *
 * Background: the `hizmetli` role was retired from the codebase
 * (Devlet UI migration cleanup). Authorization paths, frontend pages,
 * and the User schema enum no longer accept it; the matching DB
 * cleanup has to happen explicitly so existing records don't sit in
 * a state Mongoose can't validate.
 */

import { User } from '../models/User';
import logger from '../utils/logger';

export interface Migration {
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

const migration: Migration = {
  name: '003-remove-hizmetli-role',

  async up() {
    logger.info('Running migration: 003-remove-hizmetli-role (up)');

    // Use the underlying collection so the now-removed enum value
    // doesn't trip Mongoose validation.
    const result = await User.collection.deleteMany({ rol: 'hizmetli' });
    logger.info(`✅ Removed ${result.deletedCount} hizmetli user(s)`);
  },

  async down() {
    logger.warn(
      'Migration 003-remove-hizmetli-role (down): no-op — deleted user records are not recoverable',
    );
  },
};

export default migration;
