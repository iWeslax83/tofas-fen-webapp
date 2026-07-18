import { User, IUser } from '../models';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '../modules/auth/services/authService';
import { parseParentChildFile, bulkLinkParentChild } from './bulkImportService';
import { safeSearchRegex } from '../utils/regex';

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
  /** The saved Mongoose document (intentionally includes sifre hash — callers send it as-is) */
  user?: IUser;
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
  success?: true;
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

export interface LinkParentChildParams {
  parentId: string;
  childId: string;
}

export interface LinkParentChildResult {
  notFound?: true;
  invalidRole?: true;
  success?: true;
}

export interface GetChildrenResult {
  notFound?: true;
  children?: IUser[];
}

export interface BulkLinkParams {
  fileBuffer: Buffer;
  originalname: string;
  preview: boolean;
}

export interface BulkLinkResult {
  noData?: true;
  preview?: true;
  total?: number;
  links?: Array<{ parentId: string; childId: string }>;
  linked?: number;
  errors?: { parentId: string; childId: string; message: string }[];
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
  return { user: safeUser as unknown as IUser };
}

/** POST /api/users/create — legacy create endpoint */
export async function createUserLegacy(
  params: CreateUserLegacyParams,
): Promise<CreateUserLegacyResult> {
  const { id, adSoyad, tckn, sifre, rol, sinif, sube, oda, pansiyon, email } = params;

  if (!id || !adSoyad || !rol) {
    return { missingFields: true };
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
  return { success: true };
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

/** DELETE /api/users/:userId — always succeeds (204 even for missing ids) */
export async function deleteUser(userId: string): Promise<void> {
  await User.deleteOne({ id: userId });
}

/** POST /api/users/parent-child-link — bidirectional parent-child relationship */
export async function linkParentChild(
  params: LinkParentChildParams,
): Promise<LinkParentChildResult> {
  const { parentId, childId } = params;

  const parent = await User.findOne({ id: parentId });
  const child = await User.findOne({ id: childId });
  if (!parent || !child) {
    return { notFound: true };
  }
  if (parent.rol !== 'parent' || child.rol !== 'student') {
    return { invalidRole: true };
  }
  if (!parent.childId) parent.childId = [];
  if (!parent.childId.includes(childId)) {
    parent.childId.push(childId);
    await parent.save();
  }
  if (child.parentId !== parentId) {
    child.parentId = parentId;
    await child.save();
  }
  return { success: true };
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

/** POST /api/users/bulk-parent-child-link */
export async function bulkLinkParentChildFromFile(params: BulkLinkParams): Promise<BulkLinkResult> {
  const { fileBuffer, originalname, preview } = params;

  const links = parseParentChildFile(fileBuffer, originalname);
  if (links.length === 0) {
    return { noData: true };
  }

  if (preview) {
    return {
      preview: true,
      total: links.length,
      links: links.slice(0, 100),
    };
  }

  const result = await bulkLinkParentChild(links);
  return {
    linked: result.linked,
    errors: result.errors,
  };
}
