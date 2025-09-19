// User and Authentication Types
export type UserRole = 'student' | 'teacher' | 'parent' | 'admin' | 'hizmetli';

export interface IUser {
  _id: string;
  id: string;
  name: string;
  surname: string;
  rol: UserRole;
  email: string;
  emailVerified: boolean;
  pansiyon: boolean;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// Extended user interface for dashboard components
export interface ExtendedUser {
  id: string;
  _id?: string;
  adSoyad: string;
  rol: UserRole;
  email?: string;
  telefon?: string;
  adres?: string;
  dogumTarihi?: string;
  cinsiyet?: string;
  meslek?: string;
  departman?: string;
  girisTarihi?: string;
  sinif?: string;
  sube?: string;
  oda?: string;
  pansiyon?: boolean;
  childId?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAuthState {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error Types
export interface AppError {
  id: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: Date;
  userInfo?: {
    userId?: string;
    userRole?: UserRole;
    userAgent?: string;
  };
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends BaseComponentProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
}

// Form Types
export interface FormField<T = unknown> {
  value: T;
  error?: string;
  touched: boolean;
  required: boolean;
}

export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
}

// Navigation Types
export interface NavigationItem {
  label: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: NavigationItem[];
  roles?: UserRole[];
}

// Notification Types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

// Theme Types
export interface Theme {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Request Types
export interface Request {
  _id: string;
  userId: string;
  type: 'class-change' | 'room-change' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  details: {
    sinif?: string;
    sube?: string;
    oda?: string;
    currentClass?: string;
    currentSection?: string;
    currentRoom?: string;
    reason?: string;
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt?: string;
  rejectionReason?: string;
}

// Club Types
export interface Club {
  _id: string;
  name: string;
  description?: string;
  category: string;
  maxMembers?: number;
  currentMembers: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ClubMember {
  _id: string;
  userId: string;
  clubId: string;
  role: 'member' | 'admin' | 'moderator';
  joinedAt: string;
  user?: ExtendedUser;
}

export interface ClubRequest {
  _id: string;
  userId: string;
  clubId: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  createdAt: string;
  user?: ExtendedUser;
}

// Homework Types
export interface Homework {
  _id: string;
  title: string;
  description: string;
  subject: string;
  dueDate: string;
  assignedBy: string;
  assignedTo: string[];
  status: 'active' | 'completed' | 'overdue';
  attachments?: string[];
  createdAt: string;
  updatedAt?: string;
}

// Note Types
export interface Note {
  _id: string;
  studentId: string;
  subject: string;
  grade: number;
  examType: 'midterm' | 'final' | 'quiz' | 'homework';
  semester: string;
  academicYear: string;
  teacherId: string;
  createdAt: string;
  updatedAt?: string;
}

// Announcement Types
export interface Announcement {
  _id: string;
  title: string;
  content: string;
  author: string;
  targetRoles: UserRole[];
  isActive: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt?: string;
}

// Schedule Types
export interface Schedule {
  _id: string;
  classLevel: string;
  section: string;
  dayOfWeek: number;
  period: number;
  subject: string;
  teacherId: string;
  room: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Event Types
export interface AppEvent {
  id: string;
  type: string;
  payload: unknown;
  timestamp: Date;
  userId?: string;
}

// Loading States
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  loading: LoadingState;
  error: string | null;
}
