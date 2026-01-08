/**
 * Shared User Types
 * These types are used by both client and server to ensure type safety across the API boundary
 */

export type UserRole = 'student' | 'teacher' | 'parent' | 'admin' | 'hizmetli';

export interface User {
  id: string;
  adSoyad: string;
  rol: UserRole;
  email?: string;
  sinif?: string;
  sube?: string;
  oda?: string;
  pansiyon: boolean;
  parentId?: string;
  childId?: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
}

export interface LoginRequest {
  id: string;
  sifre: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  tokenVersion: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface LogoutRequest {
  accessToken: string;
  refreshToken: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface UserProfileResponse {
  success: boolean;
  user: User;
}

