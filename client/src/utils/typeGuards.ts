import { IUser, UserRole, ApiResponse, AppError, Theme } from '../@types';

// User Type Guards
export const isUser = (obj: unknown): obj is IUser => {
  if (!obj || typeof obj !== 'object' || obj === null) return false;

  const o = obj as any;
  return (
    typeof o._id === 'string' &&
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.surname === 'string' &&
    isUserRole(o.rol) &&
    typeof o.email === 'string' &&
    typeof o.emailVerified === 'boolean' &&
    typeof o.pansiyon === 'boolean' &&
    typeof o.tokenVersion === 'number' &&
    o.createdAt instanceof Date &&
    o.updatedAt instanceof Date
  );
};

export const isUserRole = (value: unknown): value is UserRole => {
  return typeof value === 'string' && ['student', 'teacher', 'parent', 'admin', 'hizmetli'].includes(value);
};

export const isPartialUser = (obj: unknown): obj is Partial<IUser> => {
  if (!obj || typeof obj !== 'object') return false;

  const validKeys = ['_id', 'id', 'name', 'surname', 'rol', 'email', 'emailVerified', 'pansiyon', 'tokenVersion', 'createdAt', 'updatedAt'];
  const objKeys = Object.keys(obj);

  return objKeys.every(key => validKeys.includes(key));
};

// API Response Type Guards
export const isApiResponse = <T>(obj: unknown): obj is ApiResponse<T> => {
  if (!obj || typeof obj !== 'object' || obj === null) return false;

  const o = obj as any;
  return (
    typeof o.success === 'boolean' &&
    typeof o.statusCode === 'number'
  );
};

export const isPaginatedResponse = <T>(obj: unknown): obj is ApiResponse<T[]> & { pagination: { page: number; limit: number; total: number; totalPages: number } } => {
  if (!isApiResponse<T[]>(obj) || !('pagination' in obj)) return false;

  const pagination = obj.pagination as { page: number; limit: number; total: number; totalPages: number };
  return (
    pagination &&
    typeof pagination === 'object' &&
    typeof pagination.page === 'number' &&
    typeof pagination.limit === 'number' &&
    typeof pagination.total === 'number' &&
    typeof pagination.totalPages === 'number'
  );
};

// Error Type Guards
export const isAppError = (obj: unknown): obj is AppError => {
  if (!obj || typeof obj !== 'object' || obj === null) return false;

  const o = obj as any;
  return (
    typeof o.id === 'string' &&
    typeof o.message === 'string' &&
    typeof o.timestamp === 'object' &&
    o.timestamp instanceof Date
  );
};

export const isError = (obj: unknown): obj is Error => {
  if (!obj || typeof obj !== 'object' || obj === null) return false;

  const o = obj as any;
  return (
    typeof o.message === 'string' &&
    typeof (obj as any).name === 'string'
  );
};


// Theme Type Guards
export const isTheme = (obj: unknown): obj is Theme => {
  if (!obj || typeof obj !== 'object' || obj === null) return false;

  const o = obj as any;
  return (
    ['light', 'dark', 'system'].includes(o.mode) &&
    typeof o.primaryColor === 'string' &&
    typeof o.secondaryColor === 'string' &&
    typeof o.backgroundColor === 'string' &&
    typeof o.textColor === 'string'
  );
};

// Array Type Guards
export const isArrayOfUsers = (arr: unknown): arr is IUser[] => {
  return Array.isArray(arr) && arr.every(isUser);
};


// Primitive Type Guards
export const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' && !isNaN(value);
};

export const isBoolean = (value: unknown): value is boolean => {
  return typeof value === 'boolean';
};

export const isDate = (value: unknown): value is Date => {
  return value instanceof Date;
};

export const isFunction = (value: unknown): value is (...args: unknown[]) => unknown => {
  return typeof value === 'function';
};

export const isObject = (value: unknown): value is object => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

export const isArray = (value: unknown): value is unknown[] => {
  return Array.isArray(value);
};

// Null/Undefined Type Guards
export const isNull = (value: unknown): value is null => {
  return value === null;
};

export const isUndefined = (value: unknown): value is undefined => {
  return value === undefined;
};

export const isNullOrUndefined = (value: unknown): value is null | undefined => {
  return value === null || value === undefined;
};

// Form Validation Type Guards
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 8;
};

export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Deep Type Checking
export const hasProperty = <T extends object, K extends keyof T>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> => {
  return key in obj;
};

export const hasProperties = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): obj is T & Record<K, unknown> => {
  return keys.every(key => key in obj);
};

// Type Assertion Helpers
export const assertIsUser = (obj: unknown): asserts obj is IUser => {
  if (!isUser(obj)) {
    throw new Error('Object is not a valid User');
  }
};

export const assertIsApiResponse = <T>(obj: unknown): asserts obj is ApiResponse<T> => {
  if (!isApiResponse<T>(obj)) {
    throw new Error('Object is not a valid ApiResponse');
  }
};

// Safe Type Conversion
export const asUser = (obj: unknown): IUser | null => {
  return isUser(obj) ? obj : null;
};

export const asApiResponse = <T>(obj: unknown): ApiResponse<T> | null => {
  return isApiResponse<T>(obj) ? obj : null;
};

// Type Narrowing Helpers
export const narrowToUser = (value: unknown): IUser | null => {
  if (isUser(value)) return value;
  return null;
};

export const narrowToArray = <T>(value: unknown, guard: (item: unknown) => item is T): T[] | null => {
  if (Array.isArray(value) && value.every(guard)) return value;
  return null;
};
