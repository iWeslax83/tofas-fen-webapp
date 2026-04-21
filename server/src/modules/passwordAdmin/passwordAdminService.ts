import bcrypt from 'bcryptjs';
import { User, PasswordAuditReason } from '../../models';
import { generatePassword } from './passwordGenerator';
import { recordPasswordEvent } from './passwordAuditService';

const BCRYPT_ROUNDS = 10;

export interface AdminContext {
  id: string;
  adSoyad: string;
  ip?: string;
  userAgent?: string;
}

export interface ResetInput {
  userId: string;
  admin: AdminContext;
  reason: PasswordAuditReason;
  reasonNote?: string;
}

export interface PasswordOperationResult {
  password: string;
  userId: string;
}

async function loadUserOrThrow(userId: string) {
  const user = await User.findOne({ id: userId });
  if (!user) {
    const err: NodeJS.ErrnoException = new Error(`Kullanıcı bulunamadı: ${userId}`);
    err.code = 'USER_NOT_FOUND';
    throw err;
  }
  return user;
}

export async function resetUserPassword(input: ResetInput): Promise<PasswordOperationResult> {
  const user = await loadUserOrThrow(input.userId);

  await recordPasswordEvent({
    user: { id: user.id, adSoyad: user.adSoyad, rol: user.rol },
    admin: { id: input.admin.id, adSoyad: input.admin.adSoyad },
    action: 'admin_reset',
    reason: input.reason,
    reasonNote: input.reasonNote,
    ip: input.admin.ip,
    userAgent: input.admin.userAgent,
  });

  const password = generatePassword();
  user.sifre = await bcrypt.hash(password, BCRYPT_ROUNDS);
  user.passwordLastSetAt = new Date();
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  return { password, userId: user.id };
}

export async function generateUserPassword(input: ResetInput): Promise<PasswordOperationResult> {
  const user = await loadUserOrThrow(input.userId);
  if (user.passwordLastSetAt) {
    const err: NodeJS.ErrnoException = new Error(
      'Kullanıcının zaten bir şifresi var; reset kullanın',
    );
    err.code = 'ALREADY_HAS_PASSWORD';
    throw err;
  }

  await recordPasswordEvent({
    user: { id: user.id, adSoyad: user.adSoyad, rol: user.rol },
    admin: { id: input.admin.id, adSoyad: input.admin.adSoyad },
    action: 'admin_generated',
    reason: input.reason,
    reasonNote: input.reasonNote,
    ip: input.admin.ip,
    userAgent: input.admin.userAgent,
  });

  const password = generatePassword();
  user.sifre = await bcrypt.hash(password, BCRYPT_ROUNDS);
  user.passwordLastSetAt = new Date();
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  return { password, userId: user.id };
}
