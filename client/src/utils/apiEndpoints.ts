// Standard API endpoints configuration
export const API_ENDPOINTS = {
  // Authentication endpoints
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    ME: '/api/auth/me',
    VERIFY_EMAIL: '/api/auth/verify-email',
    SEND_VERIFICATION: '/api/auth/send-verification',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
  },

  // User management endpoints
  USER: {
    BASE: '/api/user',
    CREATE: '/api/user/create',
    UPDATE: (id: string) => `/api/user/${id}/update`,
    DELETE: (id: string) => `/api/user/${id}/delete`,
    GET_BY_ID: (id: string) => `/api/user/${id}`,
    GET_BY_ROLE: (role: string) => `/api/user?role=${role}`,
    GET_CHILDREN: (parentId: string) => `/api/user/${parentId}/children`,
    CHANGE_PASSWORD: '/api/user/change-password',
    EMAIL: {
      SEND_CODE: '/api/user/email/send-code',
      VERIFY_CODE: '/api/user/email/verify-code',
    },
    PARENT_CHILD: {
      LINK: '/api/user/parent-child-link',
      UNLINK: '/api/user/parent-child-link',
    },
  },

  // Notes and grades endpoints
  NOTES: {
    BASE: '/api/notes',
    CREATE: '/api/notes/create',
    UPDATE: (id: string) => `/api/notes/${id}`,
    DELETE: (id: string) => `/api/notes/${id}`,
    BULK_UPDATE: '/api/notes/bulk-update',
    STATS: '/api/notes/stats',
    IMPORT: {
      FORMATS: '/api/notes/import/formats',
      FILE: '/api/notes/import/file',
    },
    TEMPLATE: {
      DOWNLOAD: '/api/notes/template/download',
    },
  },

  // Homework endpoints
  HOMEWORKS: {
    BASE: '/api/homeworks',
    CREATE: '/api/homeworks/create',
    UPDATE: (id: string) => `/api/homeworks/${id}`,
    DELETE: (id: string) => `/api/homeworks/${id}`,
    GET_BY_STUDENT: (studentId: string) => `/api/homeworks/student/${studentId}`,
    GET_BY_TEACHER: (teacherId: string) => `/api/homeworks/teacher/${teacherId}`,
  },

  // Announcements endpoints
  ANNOUNCEMENTS: {
    BASE: '/api/announcements',
    CREATE: '/api/announcements/create',
    UPDATE: (id: string) => `/api/announcements/${id}`,
    DELETE: (id: string) => `/api/announcements/${id}`,
    GET_BY_ROLE: (role: string) => `/api/announcements/role/${role}`,
  },

  // Schedule endpoints
  SCHEDULE: {
    BASE: '/api/schedule',
    CREATE: '/api/schedule/create',
    UPDATE: (id: string) => `/api/schedule/${id}`,
    DELETE: (id: string) => `/api/schedule/${id}`,
    GET_BY_CLASS: (classLevel: string, section: string) => 
      `/api/schedule/class/${classLevel}/${section}`,
    GET_BY_TEACHER: (teacherId: string) => `/api/schedule/teacher/${teacherId}`,
  },

  // Clubs endpoints
  CLUBS: {
    BASE: '/api/clubs',
    CREATE: '/api/clubs/create',
    UPDATE: (id: string) => `/api/clubs/${id}`,
    DELETE: (id: string) => `/api/clubs/${id}`,
    GET_BY_ID: (id: string) => `/api/clubs/${id}`,
    JOIN: (id: string) => `/api/clubs/${id}/join`,
    LEAVE: (id: string) => `/api/clubs/${id}/leave`,
    MEMBERS: {
      BASE: (id: string) => `/api/clubs/${id}/members`,
      ADD: (id: string) => `/api/clubs/${id}/members/add`,
      REMOVE: (id: string, memberId: string) => `/api/clubs/${id}/members/${memberId}`,
      CHANGE_ROLE: (id: string, memberId: string) => `/api/clubs/${id}/members/${memberId}/role`,
    },
    REQUESTS: {
      BASE: (id: string) => `/api/clubs/${id}/requests`,
      ACCEPT: (id: string, userId: string) => `/api/clubs/${id}/requests/${userId}/accept`,
      REJECT: (id: string, userId: string) => `/api/clubs/${id}/requests/${userId}/reject`,
    },
    INVITES: {
      BASE: (id: string) => `/api/clubs/${id}/invites`,
      SEND: (id: string) => `/api/clubs/${id}/invites/send`,
      ACCEPT: (id: string) => `/api/clubs/${id}/invites/accept`,
      REJECT: (id: string) => `/api/clubs/${id}/invites/reject`,
      INVITE_MEMBER: (id: string) => `/api/clubs/${id}/invite`,
    },
    USER: {
      BASE: (userId: string) => `/api/clubs/user/${userId}`,
      INVITES: (userId: string) => `/api/clubs/invites/${userId}`,
    },
  },

  // Dormitory endpoints
  DORMITORY: {
    MEALS: {
      BASE: '/api/dormitory/meals',
      CREATE: '/api/dormitory/meals/create',
      UPDATE: (id: string) => `/api/dormitory/meals/${id}`,
      DELETE: (id: string) => `/api/dormitory/meals/${id}`,
      DOWNLOAD: (id: string) => `/api/dormitory/meals/${id}/download`,
    },
    SUPERVISORS: {
      BASE: '/api/dormitory/supervisors',
      CREATE: '/api/dormitory/supervisors/create',
      UPDATE: (id: string) => `/api/dormitory/supervisors/${id}`,
      DELETE: (id: string) => `/api/dormitory/supervisors/${id}`,
      DOWNLOAD: (id: string) => `/api/dormitory/supervisors/${id}/download`,
    },
    MAINTENANCE: {
      BASE: '/api/maintenance',
      CREATE: '/api/maintenance',
      UPDATE: (id: string) => `/api/maintenance/${id}`,
      DELETE: (id: string) => `/api/maintenance/${id}`,
      MY_REQUESTS: '/api/maintenance/my-requests',
    },
  },

  // Evci (leave) endpoints
  EVCI: {
    BASE: '/api/evci-requests',
    CREATE: '/api/evci-requests/create',
    UPDATE: (id: string) => `/api/evci-requests/${id}`,
    DELETE: (id: string) => `/api/evci-requests/${id}`,
    GET_BY_STUDENT: (studentId: string) => `/api/evci-requests/student/${studentId}`,
    GET_BY_PARENT: (parentId: string) => `/api/evci-requests/parent/${parentId}`,
  },

  // Requests endpoints
  REQUESTS: {
    BASE: '/api/requests',
    CREATE: '/api/requests/create',
    UPDATE: (id: string) => `/api/requests/${id}`,
    DELETE: (id: string) => `/api/requests/${id}`,
    GET_BY_USER: (userId: string) => `/api/requests/user/${userId}`,
    GET_BY_STATUS: (status: string) => `/api/requests/status/${status}`,
  },

  // Notifications endpoints
  NOTIFICATIONS: {
    BASE: '/api/notifications',
    CREATE: '/api/notifications/create',
    MARK_READ: (id: string) => `/api/notifications/${id}/read`,
    MARK_ALL_READ: '/api/notifications/mark-all-read',
    GET_BY_USER: (userId: string) => `/api/notifications/user/${userId}`,
    GET_UNREAD: (userId: string) => `/api/notifications/user/${userId}/unread`,
  },

  // Calendar endpoints
  CALENDAR: {
    CALENDARS: {
      BASE: '/api/calendar/calendars',
      GET_BY_ID: (id: string) => `/api/calendar/calendars/${id}`,
      CREATE: '/api/calendar/calendars',
      UPDATE: (id: string) => `/api/calendar/calendars/${id}`,
      DELETE: (id: string) => `/api/calendar/calendars/${id}`,
      SHARE: (id: string) => `/api/calendar/calendars/${id}/share`,
    },
    EVENTS: {
      BASE: '/api/calendar/events',
      GET_BY_ID: (id: string) => `/api/calendar/events/${id}`,
      CREATE: '/api/calendar/events',
      UPDATE: (id: string) => `/api/calendar/events/${id}`,
      DELETE: (id: string) => `/api/calendar/events/${id}`,
      RESPOND: (id: string) => `/api/calendar/events/${id}/respond`,
      CLUB_CREATE: (clubId: string) => `/api/clubs/${clubId}/events`,
      CLUB_DELETE: (clubId: string, eventId: string) => `/api/clubs/${clubId}/events/${eventId}`,
    },
    ANNOUNCEMENTS: {
      BASE: '/api/calendar/announcements',
      CLUB_CREATE: (clubId: string) => `/api/clubs/${clubId}/announcements`,
      CLUB_DELETE: (clubId: string, announcementId: string) => `/api/clubs/${clubId}/announcements/${announcementId}`,
    },
    STATS: '/api/calendar/stats',
    REMINDERS: {
      PROCESS: '/api/calendar/reminders/process',
    },
    EXPORT: {
      BASE: (calendarId: string) => `/api/calendar/export/${calendarId}`,
    },
    IMPORT: {
      BASE: (calendarId: string) => `/api/calendar/import/${calendarId}`,
    },
  },

  // Monitoring endpoints
  MONITORING: {
    HEALTH: '/api/monitoring/health',
    METRICS: '/api/monitoring/metrics',
    MEMORY: '/api/monitoring/memory',
    CPU: '/api/monitoring/cpu',
    UPTIME: '/api/monitoring/uptime',
    WARNINGS: '/api/monitoring/warnings',
  },

  // File Management endpoints
  FILES: {
    BASE: '/api/files',
    GET_BY_ID: (id: string) => `/api/files/${id}`,
    CREATE: '/api/files',
    UPDATE: (id: string) => `/api/files/${id}`,
    DELETE: (id: string) => `/api/files/${id}`,
    DOWNLOAD: (id: string) => `/api/files/${id}/download`,
    SHARE: (id: string) => `/api/files/${id}/share`,
    FOLDERS: {
      BASE: '/api/files/folders',
      GET_BY_ID: (id: string) => `/api/files/folders/${id}`,
      CREATE: '/api/files/folders',
      UPDATE: (id: string) => `/api/files/folders/${id}`,
      DELETE: (id: string) => `/api/files/folders/${id}`,
      SHARE: (id: string) => `/api/files/folders/${id}/share`,
      TREE: '/api/files/folders/tree',
    },
    SEARCH: '/api/files/search',
    STATS: '/api/files/stats',
    BULK: {
      DELETE: '/api/files/bulk/delete',
      MOVE: '/api/files/bulk/move',
    },
  },

  // Communication endpoints
  COMMUNICATION: {
    MESSAGES: {
      BASE: '/api/communication/messages',
      GET_BY_CONVERSATION: (conversationId: string) => `/api/communication/messages/${conversationId}`,
      CREATE: '/api/communication/messages',
      UPDATE: (id: string) => `/api/communication/messages/${id}`,
      DELETE: (id: string) => `/api/communication/messages/${id}`,
      REACTIONS: (id: string) => `/api/communication/messages/${id}/reactions`,
    },
    CONVERSATIONS: {
      BASE: '/api/communication/conversations',
      GET_BY_ID: (id: string) => `/api/communication/conversations/${id}`,
      CREATE: '/api/communication/conversations',
      PARTICIPANTS: {
        ADD: (id: string) => `/api/communication/conversations/${id}/participants`,
        REMOVE: (id: string, userId: string) => `/api/communication/conversations/${id}/participants/${userId}`,
      },
    },
    EMAILS: {
      BASE: '/api/communication/emails',
      CREATE: '/api/communication/emails',
      SEND: (id: string) => `/api/communication/emails/${id}/send`,
    },
    CHATROOMS: {
      BASE: '/api/communication/chatrooms',
      CREATE: '/api/communication/chatrooms',
      JOIN: (id: string) => `/api/communication/chatrooms/${id}/join`,
      LEAVE: (id: string) => `/api/communication/chatrooms/${id}/leave`,
    },
    CONTACTS: {
      BASE: '/api/communication/contacts',
      CREATE: '/api/communication/contacts',
      STATUS: (id: string) => `/api/communication/contacts/${id}/status`,
      BLOCK: (id: string) => `/api/communication/contacts/${id}/block`,
      UNBLOCK: (id: string) => `/api/communication/contacts/${id}/unblock`,
    },
    SEARCH: '/api/communication/search',
    STATS: '/api/communication/stats',
    UPLOAD: '/api/communication/upload',
  },

  // Performance endpoints
  PERFORMANCE: {
    METRICS: {
      BASE: '/api/performance/metrics',
      GET_BY_TYPE: (type: string) => `/api/performance/metrics/type/${type}`,
      CRITICAL: '/api/performance/metrics/critical',
    },
    OPTIMIZATIONS: {
      BASE: '/api/performance/optimizations',
      STATS: '/api/performance/optimizations/stats',
    },
    CONFIGS: {
      BASE: '/api/performance/configs',
      UPDATE: (id: string) => `/api/performance/configs/${id}`,
    },
    SYSTEM: {
      METRICS: '/api/performance/system',
      DATABASE: '/api/performance/database',
      API: '/api/performance/api',
    },
    DASHBOARD: '/api/performance/dashboard',
    HEALTH: '/api/performance/health',
    OPTIMIZE: {
      SCHEDULED: '/api/performance/optimize/scheduled',
      CACHE: '/api/performance/optimize/cache',
      DATABASE: '/api/performance/optimize/database',
      MEMORY: '/api/performance/optimize/memory',
    },
  },
} as const;

// Type for endpoint keys
export type ApiEndpointKey = keyof typeof API_ENDPOINTS;

// Helper function to build endpoint URLs with parameters
export const buildEndpoint = (
  baseEndpoint: string,
  params: Record<string, string | number> = {}
): string => {
  let endpoint = baseEndpoint;
  
  Object.entries(params).forEach(([key, value]) => {
    endpoint = endpoint.replace(`:${key}`, String(value));
  });
  
  return endpoint;
};

// Helper function to add query parameters
export const addQueryParams = (
  endpoint: string,
  params: Record<string, string | number | boolean> = {}
): string => {
  if (Object.keys(params).length === 0) return endpoint;
  
  const queryString = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  
  return `${endpoint}?${queryString}`;
};

// Export individual endpoint groups for easier imports
export const { AUTH, USER, NOTES, HOMEWORKS, ANNOUNCEMENTS, SCHEDULE, CLUBS, DORMITORY, EVCI, REQUESTS, NOTIFICATIONS, CALENDAR, MONITORING, FILES, COMMUNICATION, PERFORMANCE } = API_ENDPOINTS;
