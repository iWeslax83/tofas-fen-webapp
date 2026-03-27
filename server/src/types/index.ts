/**
 * Shared type definitions for the server codebase.
 * Centralizes common interfaces to replace `any` types.
 */
import { FilterQuery } from 'mongoose';
import { IUser } from '../models/User';

// ─── Mongoose filter types ───────────────────────────────────────────────────
// Use these instead of `filter: any = {}` in route handlers.

/** Generic MongoDB filter for User queries */
export type UserFilter = FilterQuery<IUser>;

/** Generic MongoDB filter — use when the model type varies */
export type MongoFilter<T> = FilterQuery<T>;

// ─── Notification payload (for WebSocket) ────────────────────────────────────

export interface NotificationPayload {
  _id?: string;
  id?: string;
  title: string;
  message: string;
  type?: string;
  priority?: string;
  category?: string;
  userId?: string;
  actionUrl?: string;
  actionText?: string;
  createdAt?: Date | string;
  read?: boolean;
}

// ─── Auth service return shapes ──────────────────────────────────────────────

export interface UserProfile {
  id: string;
  adSoyad: string;
  rol?: string;
  email?: string;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  sinif?: string;
  sube?: string;
  oda?: string;
  pansiyon?: boolean;
  lastLogin?: Date;
  createdAt?: Date;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  tokenVersion?: number;
}

export interface AuthResult {
  user: UserProfile;
  tokens?: TokenPair;
  requires2FA?: boolean;
  twoFactorSessionToken?: string;
  twoFactorExpiresAt?: number;
}

export interface TwoFactorResult {
  user: UserProfile;
  tokens: TokenPair;
  trustedDeviceToken?: string;
}

// ─── JWT 2FA session payload ─────────────────────────────────────────────────

export interface TwoFactorSessionPayload {
  userId: string;
  purpose: '2fa';
  iat?: number;
  exp?: number;
}

// ─── User data for create/update in UserService ──────────────────────────────

export interface CreateUserData {
  id: string;
  adSoyad: string;
  rol: string;
  sifre?: string;
  email?: string;
  sinif?: string;
  sube?: string;
  oda?: string;
  pansiyon?: boolean;
  tckn?: string;
  parentId?: string;
  isActive?: boolean;
  tokenVersion?: number;
  [key: string]: unknown;
}

export interface UpdateUserData {
  adSoyad?: string;
  rol?: string;
  sifre?: string;
  email?: string;
  sinif?: string;
  sube?: string;
  oda?: string;
  pansiyon?: boolean;
  isActive?: boolean;
  tokenVersion?: number;
  [key: string]: unknown;
}

// ─── User stats ──────────────────────────────────────────────────────────────

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers?: number;
  usersByRole: Record<string, number>;
  recentLogins: number;
}

// ─── Connection pool info (for db.ts) ────────────────────────────────────────

export interface ConnectionPoolInfo {
  size?: number;
  maxSize?: number;
  minSize?: number;
  available?: number;
  pending?: number;
  created?: number;
  destroyed?: number;
}
