// Authentication & Authorization
export { 
  requireAuth, 
  requireRole, 
  requireAdmin, 
  requireTeacher, 
  requireStudent, 
  requireParent, 
  requireService,
  requireClubMembership,
  requireClubLeadership,
  optionalAuth,
  csrfProtection,
  sessionSecurity,
  createRateLimiter
} from './auth';

// Validation
export {
  validateRequest,
  validateUser,
  validateNote,
  validateAnnouncement,
  validateClub,
  validateHomework,
  validateMealList,
  validateSupervisorList,
  validateMaintenanceRequest,
  validateEvciRequest,
  validateRequestData
} from './validation';

// Caching
export {
  cache,
  invalidateCache,
  sessionCache,
  cacheHelpers,
  cleanupCache
} from './cache';

// Named export for redis client (no default export in cache.ts)
export { redis } from './cache';