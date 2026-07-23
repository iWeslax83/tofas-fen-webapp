import crypto from 'crypto';
import { User, IUser } from '../models';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '../modules/auth/services/authService';
import { safeSearchRegex } from '../utils/regex';
import { NotificationService } from './NotificationService';
import logger from '../utils/logger';

/**
 * Parent accounts are no longer personal — each student gets exactly one
 * auto-generated "veli" account (id = 'V' + studentId) that both parents
 * share. This prefix can never collide with real ids: students use numeric
 * ids, teachers/admins use name- or role-based ids, and 'ZYR-' is reserved
 * for visitor accounts.
 */
export const PARENT_ACCOUNT_PREFIX = 'V';

export function parentAccountIdForStudent(studentId: string): string {
  return `${PARENT_ACCOUNT_PREFIX}${studentId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Param / Result types
// ─────────────────────────────────────────────────────────────────────────────

export interface ListUsersParams {
  role?: string;
}

export interface ListUsersByRoleParams {
  role: string;
  search?: string;
  page: number;
  limit: number;
}

export interface ListUsersByRoleResult {
  /** Set when the search term was invalid */
  badSearch?: true;
  data?: IUser[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListUsersPaginatedParams {
  /** Omit for every role — used by the admin Senkronizasyon table's "Tümü" filter. */
  role?: string;
  search?: string;
  page: number;
  limit: number;
}

export type ListUsersPaginatedResult = ListUsersByRoleResult;

export interface CreateUserParams {
  id: string;
  adSoyad: string;
  sifre: string;
  rol: string;
  sinif?: string;
  sube?: string;
  email?: string;
}

export interface CreateUserResult {
  /** Set when required fields are missing */
  validationError?: true;
  /** Set when input types are wrong (NoSQL injection guard) */
  typeError?: true;
  /** Set when a user with this id already exists */
  duplicate?: true;
  /** Set when someone tries to create a personal 'parent' account directly */
  directParentCreationBlocked?: true;
  /** The saved Mongoose document (intentionally includes sifre hash — callers send it as-is) */
  user?: IUser;
  /** Set when a student was created — the auto-generated parent account */
  parentAccount?: ParentAccountSyncResult;
}

export interface CreateUserLegacyParams {
  id: string;
  adSoyad: string;
  sifre: string;
  rol: string;
  tckn?: string;
  sinif?: string;
  sube?: string;
  oda?: string;
  pansiyon?: string;
  email?: string;
}

export interface CreateUserLegacyResult {
  missingFields?: true;
  duplicate?: true;
  missingPassword?: true;
  directParentCreationBlocked?: true;
  success?: true;
  /** Set when a student was created — the auto-generated parent account */
  parentAccount?: ParentAccountSyncResult;
}

export interface UpdateUserParams {
  userId: string;
  /** updateData has already had sensitive fields stripped by the route */
  updateData: Record<string, unknown>;
}

export interface UpdateUserResult {
  notFound?: true;
  updateFailed?: true;
  user?: IUser;
}

export interface UpdateUserLegacyParams {
  userId: string;
  /** updateData has already had sensitive + immutable fields stripped */
  updateData: Record<string, unknown>;
}

export interface UpdateUserLegacyResult {
  notFound?: true;
  user?: IUser;
}

export interface GetChildrenResult {
  notFound?: true;
  children?: IUser[];
}

export interface ParentAccountSyncResult {
  parentId: string;
  created: boolean;
  /** Plaintext password — only present when the account was just created. Never stored. */
  generatedPassword?: string;
  /** Set when V<id> already existed but wasn't a valid parent account (data conflict) */
  conflict?: true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service methods
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/users — list all users, sensitive fields excluded */
export async function listUsers(params: ListUsersParams): Promise<IUser[]> {
  const filter: Record<string, unknown> = {};
  if (params.role) {
    filter.rol = params.role;
  }
  return User.find(filter).select('-sifre -tckn') as unknown as IUser[];
}

/** GET /api/users/role/:role — paginated + optional search */
export async function listUsersByRole(
  params: ListUsersByRoleParams,
): Promise<ListUsersByRoleResult> {
  const { role, search, page, limit } = params;
  const filter: Record<string, unknown> = { rol: role };

  if (search) {
    const re = safeSearchRegex(search);
    if (re === null) {
      return { badSearch: true };
    }
    filter.$or = [{ adSoyad: re }, { id: re }];
  }

  const total = await User.countDocuments(filter);
  const users = (await User.find(filter)
    .select('-sifre -tckn')
    .skip((page - 1) * limit)
    .limit(limit)) as unknown as IUser[];

  return {
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * GET /api/users/list — paginated across all roles (or one role), with
 * search. Backs the admin Senkronizasyon table, which used to render every
 * user (hundreds) as an unpaginated card grid.
 */
export async function listUsersPaginated(
  params: ListUsersPaginatedParams,
): Promise<ListUsersPaginatedResult> {
  const { role, search, page, limit } = params;
  const filter: Record<string, unknown> = {};
  if (role) filter.rol = role;

  if (search) {
    const re = safeSearchRegex(search);
    if (re === null) {
      return { badSearch: true };
    }
    filter.$or = [{ adSoyad: re }, { id: re }];
  }

  const total = await User.countDocuments(filter);
  const users = (await User.find(filter)
    .select('-sifre -tckn')
    .sort({ adSoyad: 1 })
    .skip((page - 1) * limit)
    .limit(limit)) as unknown as IUser[];

  return {
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/** GET /api/users/me — current authenticated user */
export async function getUserById(userId: string): Promise<IUser | null> {
  return User.findOne({ id: userId }).select('-sifre -tckn') as unknown as Promise<IUser | null>;
}

/** GET /api/users/:userId — by id, sensitive fields excluded */
export async function getUserByIdForView(userId: string): Promise<IUser | null> {
  return User.findOne({ id: userId }).select('-sifre -tckn') as unknown as Promise<IUser | null>;
}

/**
 * Ensure the auto-generated shared parent account for a student exists and
 * is in sync with the student's active status. Both parents log in with
 * this single account (id 'V'+studentId) — there is no personal parent
 * identity anymore, so there's nothing to "link" or "match" by hand.
 *
 * On first creation a random password is generated and returned in plain
 * text exactly once (it is never stored or logged) so the caller can hand
 * it to the admin. On every subsequent call the existing account is just
 * kept in sync (active state, child reference).
 */
export async function ensureParentAccountForStudent(
  studentId: string,
  studentName: string,
  isActive: boolean,
): Promise<ParentAccountSyncResult> {
  const parentId = parentAccountIdForStudent(studentId);
  const existing = await User.findOne({ id: parentId });

  if (existing) {
    if (existing.rol !== 'parent') {
      // Something else already owns this id (shouldn't happen given the
      // 'V' prefix is reserved, but if it does, this is exactly the kind
      // of silent mismatch admins need to know about).
      await notifyAdminsOfParentAccountConflict(studentId, parentId);
      return { parentId, created: false, conflict: true };
    }
    let changed = false;
    if (existing.isActive !== isActive) {
      existing.isActive = isActive;
      changed = true;
    }
    if (!existing.childId?.includes(studentId)) {
      existing.childId = [...(existing.childId || []), studentId];
      changed = true;
    }
    if (changed) await existing.save();
    return { parentId, created: false };
  }

  const generatedPassword = crypto.randomBytes(9).toString('base64url');
  const hashedPassword = await bcrypt.hash(generatedPassword, BCRYPT_COST);
  const parent = new User({
    id: parentId,
    adSoyad: `${studentName} Velisi`,
    sifre: hashedPassword,
    rol: 'parent',
    childId: [studentId],
    isActive,
  });
  await parent.save();
  return { parentId, created: true, generatedPassword };
}

async function notifyAdminsOfParentAccountConflict(
  studentId: string,
  parentId: string,
): Promise<void> {
  logger.error('Parent account id conflict', { studentId, parentId });
  try {
    await NotificationService.createRoleBasedNotifications({
      roles: ['admin'],
      title: 'Veli hesabı eşleştirme hatası',
      message: `${studentId} numaralı öğrenci için otomatik veli hesabı (${parentId}) oluşturulamadı: bu id başka bir hesap tarafından kullanılıyor.`,
      type: 'error',
      priority: 'high',
      category: 'administrative',
      sendEmail: true,
      emailSubject: 'Veli hesabı eşleştirme hatası - Tofaş Fen Lisesi',
    });
  } catch (error) {
    logger.error('Failed to notify admins of parent account conflict', {
      error: error instanceof Error ? error.message : error,
      studentId,
    });
  }
}

/** POST /api/users — create user (admin only), returns raw doc including sifre hash */
export async function createUser(params: CreateUserParams): Promise<CreateUserResult> {
  const { id, adSoyad, sifre, rol, sinif, sube, email } = params;

  if (!id || !adSoyad || !rol || !sifre) {
    return { validationError: true };
  }

  if (
    typeof id !== 'string' ||
    typeof adSoyad !== 'string' ||
    typeof rol !== 'string' ||
    typeof sifre !== 'string' ||
    (email && typeof email !== 'string')
  ) {
    return { typeError: true };
  }

  if (rol === 'parent') {
    return { directParentCreationBlocked: true };
  }

  const existingUser = await User.findOne({ id });
  if (existingUser) {
    return { duplicate: true };
  }

  const hashedPassword = await bcrypt.hash(sifre, BCRYPT_COST);
  const user = new User({
    id,
    adSoyad,
    sifre: hashedPassword,
    rol,
    sinif,
    sube,
    email,
    isActive: true,
  });
  await user.save();
  // Never expose the password hash or TCKN in API responses.
  const { sifre: _sifre, tckn: _tckn, ...safeUser } = user.toObject();

  const parentAccount =
    rol === 'student' ? await ensureParentAccountForStudent(id, adSoyad, true) : undefined;

  return { user: safeUser as unknown as IUser, parentAccount };
}

/** POST /api/users/create — legacy create endpoint */
export async function createUserLegacy(
  params: CreateUserLegacyParams,
): Promise<CreateUserLegacyResult> {
  const { id, adSoyad, tckn, sifre, rol, sinif, sube, oda, pansiyon, email } = params;

  if (!id || !adSoyad || !rol) {
    return { missingFields: true };
  }

  if (rol === 'parent') {
    return { directParentCreationBlocked: true };
  }

  const existingUser = await User.findOne({ id });
  if (existingUser) {
    return { duplicate: true };
  }

  if (!sifre) {
    return { missingPassword: true };
  }

  const hashedPassword = await bcrypt.hash(sifre, BCRYPT_COST);

  const user = new User({
    id,
    adSoyad,
    sifre: hashedPassword,
    rol,
    sinif,
    sube,
    oda,
    pansiyon,
    email,
    isActive: true,
  });

  // tckn is not stored (removed for security) — parameter accepted but ignored
  void tckn;

  await user.save();

  const parentAccount =
    rol === 'student' ? await ensureParentAccountForStudent(id, adSoyad, true) : undefined;

  return { success: true, parentAccount };
}

/** PUT /api/users/:userId — update user (sensitive fields stripped by route for non-admin) */
export async function updateUser(params: UpdateUserParams): Promise<UpdateUserResult> {
  const { userId, updateData } = params;
  try {
    const user = (await User.findOneAndUpdate({ id: userId }, updateData, {
      new: true,
      runValidators: true,
    }).select('-sifre -tckn')) as unknown as IUser | null;
    if (!user) {
      return { notFound: true };
    }
    if (user.rol === 'student' && Object.prototype.hasOwnProperty.call(updateData, 'isActive')) {
      await ensureParentAccountForStudent(user.id, user.adSoyad, user.isActive);
    }
    return { user };
  } catch {
    return { updateFailed: true };
  }
}

/** PUT /api/users/:userId/update — legacy update endpoint */
export async function updateUserLegacy(
  params: UpdateUserLegacyParams,
): Promise<UpdateUserLegacyResult> {
  const { userId, updateData } = params;

  const user = (await User.findOneAndUpdate({ id: userId }, updateData, {
    new: true,
    runValidators: true,
  }).select('-sifre')) as unknown as IUser | null;

  if (!user) {
    return { notFound: true };
  }
  if (user.rol === 'student' && Object.prototype.hasOwnProperty.call(updateData, 'isActive')) {
    await ensureParentAccountForStudent(user.id, user.adSoyad, user.isActive);
  }
  return { user };
}

/**
 * Fetch the current email for a user — used by legacy update to detect email changes.
 * Returns null when user not found.
 */
export async function getUserEmailById(userId: string): Promise<string | null> {
  const doc = (await User.findOne({ id: userId }).select('email').lean()) as {
    email?: string;
  } | null;
  return doc?.email ?? null;
}

/**
 * DELETE /api/users/:userId — always succeeds (204 even for missing ids).
 * Deleting a student cascades to its auto-generated parent account, since
 * that account only ever exists to serve this one student.
 */
export async function deleteUser(userId: string): Promise<void> {
  const user = await User.findOne({ id: userId }).select('rol').lean<{ rol?: string } | null>();
  await User.deleteOne({ id: userId });
  if (user?.rol === 'student') {
    await User.deleteOne({ id: parentAccountIdForStudent(userId) });
  }
}

/** GET /api/users/parent/:parentId/children */
export async function getChildrenForParent(parentId: string): Promise<GetChildrenResult> {
  const parent = await User.findOne({ id: parentId });
  if (!parent) {
    return { notFound: true };
  }
  const children = (await User.find({
    id: { $in: parent.childId || [] },
  }).select('-sifre')) as unknown as IUser[];
  return { children };
}
