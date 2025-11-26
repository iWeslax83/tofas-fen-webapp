# API Contracts Documentation

## Versioning Strategy

API versioning follows semantic versioning (SemVer) principles:
- **Major version (v1, v2)**: Breaking changes
- **Minor version (v1.1, v1.2)**: New features, backward compatible
- **Patch version (v1.1.1)**: Bug fixes, backward compatible

## Current API Version

**v1.0.0** - Initial stable release

## API Endpoints

### Base URL
```
Production: https://api.tofasfen.com/v1
Development: http://localhost:3001/api
```

### Authentication

All endpoints (except `/auth/login`) require authentication via JWT token:

```
Authorization: Bearer <access_token>
```

### Response Format

All API responses follow this structure:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode: number;
  timestamp?: string;
}
```

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  statusCode: number;
  timestamp: string;
  details?: Record<string, any>;
}
```

## Core Endpoints

### Authentication

#### POST /api/auth/login
```typescript
Request: {
  id: string;
  sifre: string;
}

Response: {
  success: true;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}
```

#### POST /api/auth/logout
```typescript
Request: {
  refreshToken: string;
}

Response: {
  success: true;
  message: "Logged out successfully";
}
```

### Users

#### GET /api/user/me
```typescript
Response: {
  success: true;
  data: User;
}
```

#### PUT /api/user/profile
```typescript
Request: {
  adSoyad?: string;
  email?: string;
}

Response: {
  success: true;
  data: User;
}
```

### Announcements

#### GET /api/announcements
```typescript
Query Params: {
  page?: number;
  limit?: number;
  targetAudience?: string[];
  priority?: string;
}

Response: {
  success: true;
  data: Announcement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### POST /api/announcements
```typescript
Request: {
  title: string;
  content: string;
  targetAudience: string[];
  priority?: 'normal' | 'high' | 'urgent';
}

Response: {
  success: true;
  data: Announcement;
}
```

### Homeworks

#### GET /api/homeworks
```typescript
Query Params: {
  page?: number;
  limit?: number;
  assignedTo?: string;
  createdBy?: string;
}

Response: {
  success: true;
  data: Homework[];
  pagination: Pagination;
}
```

#### POST /api/homeworks
```typescript
Request: {
  title: string;
  description: string;
  dueDate: string; // ISO 8601
  assignedTo: string[];
}

Response: {
  success: true;
  data: Homework;
}
```

### Evci Requests

#### GET /api/evci-requests
```typescript
Query Params: {
  studentId?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

Response: {
  success: true;
  data: EvciRequest[];
}
```

#### POST /api/evci-requests
```typescript
Request: {
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  destination: string;
  description?: string;
}

Response: {
  success: true;
  data: EvciRequest;
}
```

## Mobile API Considerations

### Rate Limiting
- Standard endpoints: 100 requests/minute
- Authentication endpoints: 5 requests/minute
- File upload endpoints: 10 requests/hour

### Pagination
All list endpoints support pagination:
- Default page size: 20
- Maximum page size: 100
- Use `page` and `limit` query parameters

### Caching
- GET requests can be cached
- Cache-Control headers included in responses
- Mobile clients should implement offline caching

### Offline Support
- Use ETags for conditional requests
- Implement local storage for offline access
- Sync mechanism for offline changes

## GraphQL API

### Endpoint
```
POST /graphql
```

### Schema
See `server/src/graphql/schema.ts` for full schema definition.

### Example Query
```graphql
query {
  me {
    id
    adSoyad
    rol
  }
  announcements(page: 1, limit: 10) {
    nodes {
      id
      title
      content
    }
    totalCount
  }
}
```

## WebSocket API

### Endpoint
```
ws://api.tofasfen.com/notifications/:userId
```

### Message Format
```typescript
interface WebSocketMessage {
  type: 'connected' | 'new_notification' | 'notification_read';
  userId: string;
  notification?: Notification;
  timestamp: string;
}
```

## API Stability Guarantees

### Stable Endpoints (v1.0.0+)
- `/api/auth/*` - Authentication endpoints
- `/api/user/me` - Current user endpoint
- `/api/announcements` - Announcements CRUD
- `/api/homeworks` - Homeworks CRUD
- `/api/evci-requests` - Evci requests CRUD

### Experimental Endpoints
- `/api/analytics/*` - Analytics endpoints (may change)
- `/graphql` - GraphQL endpoint (may change)

## Deprecation Policy

1. **Deprecation Notice**: 6 months before removal
2. **Breaking Changes**: Only in major version updates
3. **Migration Guide**: Provided for all breaking changes

## API Changelog

### v1.0.0 (2024-12-19)
- Initial stable release
- All core endpoints available
- GraphQL API available
- WebSocket notifications available

---

**Last Updated**: 2024-12-19

