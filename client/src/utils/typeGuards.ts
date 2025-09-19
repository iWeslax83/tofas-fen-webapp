import { IUser, UserRole, ApiResponse, AppError, Notification, Theme } from '../@types';

// User Type Guards
export const isUser = (obj: any): obj is IUser => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj._id === 'string' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.surname === 'string' &&
    isUserRole(obj.rol) &&
    typeof obj.email === 'string' &&
    typeof obj.emailVerified === 'boolean' &&
    typeof obj.pansiyon === 'boolean' &&
    typeof obj.tokenVersion === 'number' &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date
  );
};

export const isUserRole = (value: any): value is UserRole => {
  return ['student', 'teacher', 'parent', 'admin', 'hizmetli'].includes(value);
};

export const isPartialUser = (obj: any): obj is Partial<IUser> => {
  if (!obj || typeof obj !== 'object') return false;
  
  const validKeys = ['_id', 'id', 'name', 'surname', 'rol', 'email', 'emailVerified', 'pansiyon', 'tokenVersion', 'createdAt', 'updatedAt'];
  const objKeys = Object.keys(obj);
  
  return objKeys.every(key => validKeys.includes(key));
};

// API Response Type Guards
export const isApiResponse = <T>(obj: any): obj is ApiResponse<T> => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.success === 'boolean' &&
    typeof obj.statusCode === 'number'
  );
};

export const isPaginatedResponse = <T>(obj: any): obj is ApiResponse<T[]> & { pagination: any } => {
  return (
    isApiResponse<T[]>(obj) &&
    'pagination' in obj &&
    obj.pagination &&
    typeof obj.pagination === 'object' &&
    typeof (obj.pagination as any).page === 'number' &&
    typeof (obj.pagination as any).limit === 'number' &&
    typeof (obj.pagination as any).total === 'number' &&
    typeof (obj.pagination as any).totalPages === 'number'
  );
};

// Error Type Guards
export const isAppError = (obj: any): obj is AppError => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.timestamp === 'object' &&
    obj.timestamp instanceof Date
  );
};

export const isError = (obj: any): obj is Error => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.message === 'string' &&
    typeof obj.name === 'string'
  );
};

// Notification Type Guards
export const isNotification = (obj: any): obj is Notification => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    ['info', 'success', 'warning', 'error'].includes(obj.type) &&
    typeof obj.title === 'string' &&
    typeof obj.message === 'string' &&
    obj.timestamp instanceof Date &&
    typeof obj.read === 'boolean'
  );
};

// Theme Type Guards
export const isTheme = (obj: any): obj is Theme => {
  return (
    obj &&
    typeof obj === 'object' &&
    ['light', 'dark', 'system'].includes(obj.mode) &&
    typeof obj.primaryColor === 'string' &&
    typeof obj.secondaryColor === 'string' &&
    typeof obj.backgroundColor === 'string' &&
    typeof obj.textColor === 'string'
  );
};

// Array Type Guards
export const isArrayOfUsers = (arr: any): arr is IUser[] => {
  return Array.isArray(arr) && arr.every(isUser);
};

export const isArrayOfNotifications = (arr: any): arr is Notification[] => {
  return Array.isArray(arr) && arr.every(isNotification);
};

// Primitive Type Guards
export const isString = (value: any): value is string => {
  return typeof value === 'string';
};

export const isNumber = (value: any): value is number => {
  return typeof value === 'number' && !isNaN(value);
};

export const isBoolean = (value: any): value is boolean => {
  return typeof value === 'boolean';
};

export const isDate = (value: any): value is Date => {
  return value instanceof Date;
};

export const isFunction = (value: any): value is Function => {
  return typeof value === 'function';
};

export const isObject = (value: any): value is object => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

export const isArray = (value: any): value is any[] => {
  return Array.isArray(value);
};

// Null/Undefined Type Guards
export const isNull = (value: any): value is null => {
  return value === null;
};

export const isUndefined = (value: any): value is undefined => {
  return value === undefined;
};

export const isNullOrUndefined = (value: any): value is null | undefined => {
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
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
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
export const assertIsUser = (obj: any): asserts obj is IUser => {
  if (!isUser(obj)) {
    throw new Error('Object is not a valid User');
  }
};

export const assertIsApiResponse = <T>(obj: any): asserts obj is ApiResponse<T> => {
  if (!isApiResponse<T>(obj)) {
    throw new Error('Object is not a valid ApiResponse');
  }
};

// Safe Type Conversion
export const asUser = (obj: any): IUser | null => {
  return isUser(obj) ? obj : null;
};

export const asApiResponse = <T>(obj: any): ApiResponse<T> | null => {
  return isApiResponse<T>(obj) ? obj : null;
};

// Type Narrowing Helpers
export const narrowToUser = (value: any): IUser | null => {
  if (isUser(value)) return value;
  return null;
};

export const narrowToArray = <T>(value: any, guard: (item: any) => item is T): T[] | null => {
  if (Array.isArray(value) && value.every(guard)) return value;
  return null;
};
