// Authentication & Authorization
export {
  requireAuth,
  requireRole,
  requireAdmin,
  requireTeacher,
  requireStudent,
  requireParent,
  requireService,
  csrfProtection,
  sessionSecurity,
  createRateLimiter,
} from './auth';

// Validation
export {
  validateRequest,
  validateUser,
  validateNote,
  validateAnnouncement,
  validateHomework,
  validateMealList,
  validateSupervisorList,
  validateMaintenanceRequest,
  validateEvciRequest,
  validateRequestData,
} from './validation';

// Caching
export { cache, invalidateCache, sessionCache, cacheHelpers, cleanupCache } from './cache';

// Named export for redis client (no default export in cache.ts)
export { redis } from './cache';
