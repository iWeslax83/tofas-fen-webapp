# TypeScript Type Safety & Error Boundary Implementation

This document describes the comprehensive type safety features and error boundary implementation added to the Tofas Fen Webapp.

## 🎯 Overview

The implementation provides:
- **Comprehensive TypeScript interfaces** for all application entities
- **Runtime type guards** for safe type checking
- **React Error Boundaries** with specialized error handling
- **Type-safe API utilities** with proper error handling
- **Custom React hooks** for type-safe API calls
- **Form validation** with type safety

## 📁 File Structure

```
src/
├── @types/
│   └── index.ts                 # Main type definitions
├── utils/
│   ├── typeGuards.ts           # Runtime type checking functions
│   └── apiUtils.ts             # Type-safe API utilities
├── hooks/
│   └── useApi.ts               # Custom hooks for API calls
├── components/
│   ├── ErrorBoundary.tsx       # Main error boundary component
│   ├── ErrorBoundaries.tsx     # Specialized error boundaries
│   └── TypeSafeDemo.tsx        # Demo component showcasing features
└── TYPE_SAFETY_README.md       # This documentation
```

## 🔧 Type Definitions

### Core Interfaces

```typescript
// User and authentication
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

export type UserRole = 'student' | 'teacher' | 'parent' | 'admin' | 'hizmetli';

// API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode: number;
}

// Error handling
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
```

### Component Props Types

```typescript
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
```

## 🛡️ Type Guards

### User Type Guards

```typescript
import { isUser, isUserRole, isPartialUser } from '../utils/typeGuards';

// Check if object is a valid user
if (isUser(userData)) {
  // TypeScript now knows userData is IUser
  console.log(userData.name); // ✅ Safe access
}

// Check if value is a valid user role
if (isUserRole(role)) {
  // TypeScript now knows role is UserRole
  console.log(role); // ✅ Type-safe
}

// Check if object has valid user properties
if (isPartialUser(partialData)) {
  // TypeScript now knows partialData is Partial<IUser>
  if (partialData.name) {
    console.log(partialData.name); // ✅ Safe access
  }
}
```

### API Response Guards

```typescript
import { isApiResponse, isPaginatedResponse } from '../utils/typeGuards';

// Validate API response structure
if (isApiResponse<User[]>(response)) {
  // TypeScript knows response is ApiResponse<User[]>
  if (response.success && response.data) {
    response.data.forEach(user => {
      console.log(user.name); // ✅ Safe access
    });
  }
}

// Validate paginated response
if (isPaginatedResponse<User>(response)) {
  // TypeScript knows response has pagination
  console.log(`Page ${response.pagination.page} of ${response.pagination.totalPages}`);
}
```

### Form Validation Guards

```typescript
import { isValidEmail, isValidPassword, isValidPhoneNumber } from '../utils/typeGuards';

// Email validation
if (!isValidEmail(email)) {
  setError('Please enter a valid email address');
}

// Password validation
if (!isValidPassword(password)) {
  setError('Password must be at least 8 characters long');
}

// Phone validation
if (!isValidPhoneNumber(phone)) {
  setError('Please enter a valid phone number');
}
```

## 🚨 Error Boundaries

### Basic Error Boundary

```typescript
import ErrorBoundary from '../components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary
      boundaryName="App"
      onError={(error) => {
        console.error('App error:', error);
        // Send to error reporting service
      }}
      fallback={(error, resetError) => (
        <div className="error-ui">
          <h2>Something went wrong</h2>
          <p>{error.message}</p>
          <button onClick={resetError}>Try Again</button>
        </div>
      )}
    >
      <YourAppContent />
    </ErrorBoundary>
  );
}
```

### Specialized Error Boundaries

```typescript
import { 
  ApiErrorBoundary, 
  FormErrorBoundary, 
  AuthErrorBoundary,
  RouteErrorBoundary 
} from '../components/ErrorBoundaries';

// API Error Boundary
<ApiErrorBoundary onApiError={(error) => console.error('API Error:', error)}>
  <ApiComponent />
</ApiErrorBoundary>

// Form Error Boundary
<FormErrorBoundary onFormError={(error) => console.error('Form Error:', error)}>
  <FormComponent />
</FormErrorBoundary>

// Authentication Error Boundary
<AuthErrorBoundary onAuthError={(error) => console.error('Auth Error:', error)}>
  <AuthComponent />
</AuthErrorBoundary>

// Route Error Boundary
<RouteErrorBoundary onRouteError={(error) => console.error('Route Error:', error)}>
  <RouteComponent />
</RouteErrorBoundary>
```

### Higher-Order Components

```typescript
import { withApiErrorBoundary, withFormErrorBoundary } from '../components/ErrorBoundaries';

// Wrap component with error boundary
const SafeComponent = withApiErrorBoundary(MyComponent, (error) => {
  console.error('Component API error:', error);
});

// Usage
<SafeComponent />
```

## 🌐 Type-Safe API Calls

### Basic API Utilities

```typescript
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/apiUtils';

// GET request
const response = await apiGet<User>('/users/123');
if (response.success && response.data) {
  console.log(response.data.name); // ✅ Type-safe
}

// POST request
const newUser = await apiPost<User>('/users', {
  name: 'John',
  email: 'john@example.com',
  rol: 'student'
});

// PUT request
const updatedUser = await apiPut<User>('/users/123', {
  name: 'John Updated'
});

// DELETE request
await apiDelete('/users/123');
```

### User API with Type Safety

```typescript
import { userApi } from '../utils/apiUtils';

// Get user by ID
const userResponse = await userApi.getById('123');
if (userResponse.success && userResponse.data) {
  const user = userResponse.data; // TypeScript knows this is IUser
  console.log(user.rol); // ✅ Safe access
}

// Get all users with pagination
const usersResponse = await userApi.getAll(1, 10);
if (usersResponse.success && usersResponse.data) {
  usersResponse.data.forEach(user => {
    console.log(user.name); // ✅ Safe access
  });
}

// Create user
const createResponse = await userApi.create({
  name: 'Jane',
  email: 'jane@example.com',
  rol: 'teacher'
});
```

### Error Handling

```typescript
import { handleApiError, withRetry, withErrorHandling } from '../utils/apiUtils';

// Handle API errors
try {
  const response = await apiGet<User>('/users/123');
} catch (error) {
  const apiError = handleApiError(error);
  console.error(`API Error ${apiError.statusCode}: ${apiError.message}`);
}

// Retry failed requests
const response = await withRetry(
  () => apiGet<User>('/users/123'),
  3, // max retries
  1000 // delay between retries
)();

// Wrap with error handling
const response = await withErrorHandling(
  () => apiGet<User>('/users/123')
)();
```

## 🪝 Custom React Hooks

### useApi Hook

```typescript
import { useApi } from '../hooks/useApi';

function UserProfile({ userId }: { userId: string }) {
  const { data: user, loading, error, execute } = useApi(
    () => userApi.getById(userId),
    { autoExecute: true, retryCount: 3 }
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>No user found</div>;

  return (
    <div>
      <h1>{user.name} {user.surname}</h1>
      <p>Role: {user.rol}</p>
      <p>Email: {user.email}</p>
    </div>
  );
}
```

### useMutation Hook

```typescript
import { useMutation } from '../hooks/useApi';

function CreateUserForm() {
  const { mutate: createUser, loading, error, reset } = useMutation(
    (userData: Partial<IUser>) => userApi.create(userData),
    {
      onSuccess: (newUser) => {
        console.log('User created:', newUser);
        // Navigate to user list
      },
      onError: (error) => {
        console.error('Failed to create user:', error);
      }
    }
  );

  const handleSubmit = (formData: Partial<IUser>) => {
    createUser(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create User'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

### usePaginatedApi Hook

```typescript
import { usePaginatedApi } from '../hooks/useApi';

function UserList() {
  const {
    data: users,
    loading,
    error,
    page,
    pagination,
    goToPage,
    nextPage,
    prevPage
  } = usePaginatedApi(
    (page, limit) => userApi.getAll(page, limit),
    { initialPage: 1, initialLimit: 10, autoExecute: true }
  );

  return (
    <div>
      {users?.map(user => (
        <div key={user._id}>
          {user.name} {user.surname} - {user.rol}
        </div>
      ))}
      
      <div className="pagination">
        <button onClick={prevPage} disabled={!pagination.hasPrevPage}>
          Previous
        </button>
        <span>Page {page} of {pagination.totalPages}</span>
        <button onClick={nextPage} disabled={!pagination.hasNextPage}>
          Next
        </button>
      </div>
    </div>
  );
}
```

## 📝 Form Validation with Type Safety

```typescript
import { isValidEmail, isValidPassword, isUserRole } from '../utils/typeGuards';

function validateForm(formData: Partial<IUser>): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!formData.name?.trim()) {
    errors.name = 'Name is required';
  }

  if (!formData.email || !isValidEmail(formData.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!formData.password || !isValidPassword(formData.password)) {
    errors.password = 'Password must be at least 8 characters long';
  }

  if (!formData.rol || !isUserRole(formData.rol)) {
    errors.rol = 'Please select a valid role';
  }

  return errors;
}
```

## 🚀 Best Practices

### 1. Always Use Type Guards

```typescript
// ❌ Bad - No type checking
function processUser(user: any) {
  console.log(user.name); // Could crash if user is null/undefined
}

// ✅ Good - With type guards
function processUser(user: any) {
  if (isUser(user)) {
    console.log(user.name); // Safe access
  }
}
```

### 2. Wrap Components with Appropriate Error Boundaries

```typescript
// ❌ Bad - No error boundary
<ComponentThatMightFail />

// ✅ Good - With error boundary
<ApiErrorBoundary>
  <ComponentThatMightFail />
</ApiErrorBoundary>
```

### 3. Use Custom Hooks for API Calls

```typescript
// ❌ Bad - Direct API calls in components
const [user, setUser] = useState(null);
useEffect(() => {
  fetch('/api/users/123')
    .then(res => res.json())
    .then(data => setUser(data));
}, []);

// ✅ Good - Using custom hook
const { data: user, loading, error } = useApi(
  () => userApi.getById('123'),
  { autoExecute: true }
);
```

### 4. Validate API Responses

```typescript
// ❌ Bad - No response validation
const response = await apiGet<User>('/users/123');
setUser(response.data); // Could be undefined

// ✅ Good - With validation
const response = await apiGet<User>('/users/123');
if (response.success && response.data && isUser(response.data)) {
  setUser(response.data);
}
```

## 🧪 Testing Error Boundaries

The `TypeSafeDemo` component includes error throwers that can be used to test error boundaries:

```typescript
// Test API error boundary
<ApiErrorBoundary>
  <ErrorThrower errorType="api" />
</ApiErrorBoundary>

// Test form error boundary
<FormErrorBoundary>
  <ErrorThrower errorType="form" />
</FormErrorBoundary>
```

## 🔧 Configuration

### Environment Variables

```bash
# API base URL
VITE_API_BASE_URL=http://localhost:3000/api

# Error reporting (optional)
VITE_SENTRY_DSN=your-sentry-dsn
```

### TypeScript Configuration

Ensure your `tsconfig.json` includes strict mode:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

## 📚 Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Type Guards in TypeScript](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)

## 🤝 Contributing

When adding new features:

1. **Define types first** - Add interfaces to `@types/index.ts`
2. **Create type guards** - Add validation functions to `utils/typeGuards.ts`
3. **Wrap with error boundaries** - Use appropriate error boundaries for new components
4. **Use custom hooks** - Leverage existing hooks for API calls
5. **Test error scenarios** - Ensure error boundaries work correctly

## 📄 License

This implementation follows the same license as the main project.
