/**
 * Safe logging utilities to prevent "Cannot convert object to primitive value" errors
 */

/**
 * Safely converts any value to a string for logging
 */
export const safeStringify = (value: unknown): string => {
  try {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      try {
        return String(value);
      } catch {
        return '[Number/Boolean conversion failed]';
      }
    }
    if (value instanceof Error) {
      try {
        return value.message || 'Error object without message';
      } catch {
        return '[Error object]';
      }
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return '[Object]';
      }
    }
    // For any other type, try to convert safely
    try {
      return String(value);
    } catch {
      return '[Conversion failed]';
    }
  } catch {
    return '[Unable to convert to string]';
  }
};

// F-H8: in production we silence all dev-level console output to avoid
// leaking information via the browser console. Real errors should be routed
// through Sentry (which has its own scrubbing); these helpers are for local
// debugging only.
const IS_DEV = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV === true;

/**
 * Safe console.error that prevents object-to-primitive conversion errors.
 * No-op in production builds.
 */
export const safeConsoleError = (message: string, error?: unknown): void => {
  if (!IS_DEV) return;
  try {
    if (error !== undefined) {
      const errorString = safeStringify(error);
      console.error(message, errorString);
    } else {
      console.error(message);
    }
  } catch (e) {
    // If even our safe logging fails, use the most basic approach
    try {
      console.error(message, '[Error logging failed]');
    } catch {
      // If console.error itself fails, try console.log
      try {
        console.log(message, '[Error logging failed]');
      } catch {
        // Last resort - do nothing to prevent infinite loops
      }
    }
  }
};

/**
 * Safe console.warn that prevents object-to-primitive conversion errors.
 * No-op in production builds.
 */
export const safeConsoleWarn = (message: string, data?: unknown): void => {
  if (!IS_DEV) return;
  try {
    if (data !== undefined) {
      const dataString = safeStringify(data);
      console.warn(message, dataString);
    } else {
      console.warn(message);
    }
  } catch (e) {
    try {
      console.warn(message, '[Warning logging failed]');
    } catch {
      try {
        console.log(message, '[Warning logging failed]');
      } catch {
        // Last resort - do nothing
      }
    }
  }
};

/**
 * Safe console.log that prevents object-to-primitive conversion errors
 */
export const safeConsoleLog = (message: string, data?: unknown): void => {
  try {
    if (data !== undefined) {
      const dataString = safeStringify(data);
      console.log(message, dataString);
    } else {
      console.log(message);
    }
  } catch (e) {
    try {
      console.log(message, '[Logging failed]');
    } catch {
      // Last resort - do nothing
    }
  }
};

/**
 * Ultra-safe error logging for ErrorBoundary components
 * This function will never throw an error, even if everything fails
 */
export const ultraSafeErrorLog = (message: string, error?: unknown): void => {
  // Use a completely isolated try-catch to prevent any interference
  (() => {
    try {
      // Try the safest possible approach
      if (error === null) {
        console.error(message, 'null');
        return;
      }
      if (error === undefined) {
        console.error(message);
        return;
      }
      if (typeof error === 'string') {
        console.error(message, error);
        return;
      }
      if (typeof error === 'number' || typeof error === 'boolean') {
        console.error(message, String(error));
        return;
      }
      if (error instanceof Error) {
        console.error(message, error.message || 'Error');
        return;
      }
      // For any other type, just log the message without the error
      console.error(message);
    } catch {
      // If even the most basic logging fails, do absolutely nothing
      // This prevents infinite loops and further errors
    }
  })();
};
