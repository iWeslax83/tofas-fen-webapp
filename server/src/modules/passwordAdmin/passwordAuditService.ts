import {
  PasswordAuditLog,
  IPasswordAuditLog,
  PasswordAuditAction,
  PasswordAuditReason,
} from '../../models';

export interface RecordPasswordEventInput {
  user: { id: string; adSoyad: string; rol: string };
  admin: { id: string; adSoyad: string };
  action: PasswordAuditAction;
  reason: PasswordAuditReason;
  reasonNote?: string;
  batchId?: string;
  ip?: string;
  userAgent?: string;
}

// Guard — a plaintext password must never transit this module.
const FORBIDDEN_KEYS = ['password', 'plaintext', 'sifre', 'pw'];
const FORBIDDEN_NOTE_RE = /password\s*[:=]/i;

function rejectIfSmellsLikePassword(input: Record<string, unknown>) {
  for (const key of Object.keys(input)) {
    if (FORBIDDEN_KEYS.includes(key)) {
      throw new Error(
        `passwordAuditService: forbidden key "${key}" — plaintext passwords cannot be audited`,
      );
    }
  }
  if (typeof input.reasonNote === 'string' && FORBIDDEN_NOTE_RE.test(input.reasonNote)) {
    throw new Error('passwordAuditService: reasonNote appears to contain a password literal');
  }
}

export async function recordPasswordEvent(
  input: RecordPasswordEventInput,
): Promise<IPasswordAuditLog> {
  rejectIfSmellsLikePassword(input as unknown as Record<string, unknown>);
  const doc = await PasswordAuditLog.create({
    userId: input.user.id,
    userSnapshot: input.user,
    adminId: input.admin.id,
    adminSnapshot: input.admin,
    action: input.action,
    reason: input.reason,
    reasonNote: input.reasonNote,
    batchId: input.batchId,
    ip: input.ip,
    userAgent: input.userAgent,
  });
  return doc;
}

export interface QueryAuditLogInput {
  userId?: string;
  adminId?: string;
  action?: PasswordAuditAction;
  reason?: PasswordAuditReason;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface QueryAuditLogResult {
  items: IPasswordAuditLog[];
  total: number;
  page: number;
  limit: number;
}

export async function queryAuditLog(input: QueryAuditLogInput): Promise<QueryAuditLogResult> {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 20));
  const filter: Record<string, unknown> = {};
  if (input.userId) filter.userId = input.userId;
  if (input.adminId) filter.adminId = input.adminId;
  if (input.action) filter.action = input.action;
  if (input.reason) filter.reason = input.reason;
  if (input.from || input.to) {
    const range: Record<string, Date> = {};
    if (input.from) range.$gte = input.from;
    if (input.to) range.$lte = input.to;
    filter.createdAt = range;
  }
  const [items, total] = await Promise.all([
    PasswordAuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    PasswordAuditLog.countDocuments(filter),
  ]);
  return { items: items as unknown as IPasswordAuditLog[], total, page, limit };
}
