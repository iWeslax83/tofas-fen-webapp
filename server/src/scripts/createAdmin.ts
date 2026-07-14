/**
 * Create (or reset the password of) a single administrator account.
 *
 * This is the only supported way to get a real admin into a production
 * database. The seed scripts are for local development: they create fixed
 * demo accounts whose password is literally "123456".
 *
 * Unlike the seeds, this touches exactly one document and never deletes
 * anything. Existing accounts are left alone unless ADMIN_RESET=true.
 *
 *   ADMIN_ID=... ADMIN_NAME=... ADMIN_PASSWORD=... npm run create-admin
 */
// Load environment variables first (mirrors src/index.ts bootstrap order).
// Without this, ../db falls back to localhost instead of the configured URI.
import '../config/environment';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../db';
import { User } from '../models/User';

// Matches the cost factor used by the auth module's password-change path.
const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;

async function createAdmin(): Promise<void> {
  const id = process.env.ADMIN_ID;
  const adSoyad = process.env.ADMIN_NAME;
  const password = process.env.ADMIN_PASSWORD;
  const email = process.env.ADMIN_EMAIL;
  const reset = process.env.ADMIN_RESET === 'true';

  const missing = [
    ['ADMIN_ID', id],
    ['ADMIN_NAME', adSoyad],
    ['ADMIN_PASSWORD', password],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
  }

  // A weak password here is a full compromise of the system: this account can
  // read every student's grades and personal data.
  if (password!.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  await connectDB();

  // The User model's pre-save hook encrypts TCKN but does NOT hash passwords;
  // every caller is expected to hash its own. Storing `password` directly here
  // would write plaintext and make login fail against bcrypt.compare.
  const sifre = await bcrypt.hash(password!, BCRYPT_ROUNDS);

  const existing = await User.findOne({ id });

  if (existing && !reset) {
    throw new Error(
      `A user with id "${id}" already exists (role: ${existing.rol}). ` +
        `Re-run with ADMIN_RESET=true to overwrite its password.`,
    );
  }

  if (existing) {
    existing.sifre = sifre;
    existing.isActive = true;
    await existing.save();
    console.log(`Password reset for existing user "${id}".`);
  } else {
    await User.create({
      id,
      adSoyad,
      rol: 'admin',
      sifre,
      isActive: true,
      ...(email ? { email } : {}),
    });
    console.log(`Administrator "${id}" created.`);
  }

  console.log('You can now sign in with this ID and password.');
}

createAdmin()
  .catch((error: unknown) => {
    console.error(`Failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
