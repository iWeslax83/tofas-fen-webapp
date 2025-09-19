// User types for the application
export interface User {
  id: string;
  adSoyad: string;
  rol: 'admin' | 'teacher' | 'student' | 'parent' | 'hizmetli';
  email?: string;
  sinif?: string;
  sube?: string;
  oda?: string;
  pansiyon?: boolean;
  parentId?: string;
  childId?: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface LoginRequest {
  id: string;
  sifre: string;
}

export interface LoginResponse extends UserResponse {}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface EmailVerificationRequest {
  userId: string;
  email: string;
}

export interface EmailCodeVerificationRequest {
  userId: string;
  code: string;
}

export interface ParentChildLinkRequest {
  parentId: string;
  childId: string;
}

export interface UserStats {
  totalUsers: number;
  usersByRole: Record<string, number>;
  activeUsers: number;
  newUsersThisMonth: number;
}

export interface UserFilters {
  role?: string;
  sinif?: string;
  sube?: string;
  pansiyon?: boolean;
  isActive?: boolean;
  search?: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  stats: UserStats;
}
