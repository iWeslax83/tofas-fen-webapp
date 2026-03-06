// User types for the application
export interface User {
  id: string;
  adSoyad: string;
  rol: 'admin' | 'teacher' | 'student' | 'parent' | 'hizmetli' | 'ziyaretci';
  email?: string;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  sinif?: string;
  sube?: string;
  oda?: string;
  pansiyon?: boolean;
  parentId?: string;
  childId?: string[];
  isActive?: boolean;
  childrenSiniflar?: { sinif: string; sube: string; adSoyad?: string }[];
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

export type LoginResponse = UserResponse;

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ChangePasswordRequest kaldırıldı - artık TCKN kullanılıyor

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
