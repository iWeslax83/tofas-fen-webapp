# 👨‍💻 Developer Documentation

## 🚀 Getting Started

### Prerequisites
- **Node.js**: 18.0.0 veya üzeri
- **MongoDB**: 4.4 veya üzeri
- **Redis**: 6.0 veya üzeri
- **Git**: 2.0 veya üzeri
- **Docker**: 20.0 veya üzeri (opsiyonel)

### Installation

#### 1. Repository'yi Klonlayın
```bash
git clone https://github.com/your-org/tofas-fen-webapp.git
cd tofas-fen-webapp
```

#### 2. Dependencies'leri Yükleyin
```bash
# Root dependencies
npm install

# Client dependencies
cd client
npm install

# Server dependencies
cd ../server
npm install
```

#### 3. Environment Variables'ları Ayarlayın
```bash
# Root .env
cp .env.example .env

# Client .env
cd client
cp .env.example .env

# Server .env
cd ../server
cp .env.example .env
```

#### 4. Environment Variables'ları Düzenleyin
```env
# Root .env
NODE_ENV=development
PORT=3000

# Client .env
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=Tofas Fen Webapp

# Server .env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/tofas-fen
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

#### 5. Database'leri Başlatın
```bash
# MongoDB'yi başlatın
mongod

# Redis'i başlatın
redis-server
```

#### 6. Development Server'ları Başlatın
```bash
# Root directory'de
npm run dev
```

## 🏗️ Architecture

### Frontend Architecture
```
client/
├── src/
│   ├── components/     # Reusable components
│   ├── pages/         # Page components
│   ├── stores/        # Zustand stores
│   ├── hooks/         # Custom hooks
│   ├── utils/         # Utility functions
│   ├── types/         # TypeScript types
│   └── styles/        # CSS files
├── public/            # Static assets
└── dist/              # Build output
```

### Backend Architecture
```
server/
├── src/
│   ├── modules/       # Feature modules
│   │   ├── auth/      # Authentication module
│   │   └── users/     # User management module
│   ├── models/        # Database models
│   ├── routes/        # API routes
│   ├── middleware/    # Express middleware
│   ├── utils/         # Utility functions
│   └── types/         # TypeScript types
├── dist/              # Build output
└── uploads/           # File uploads
```

### Database Schema
```typescript
// User Model
interface User {
  id: string;
  adSoyad: string;
  rol: 'admin' | 'teacher' | 'student' | 'parent' | 'hizmetli';
  email?: string;
  sinif?: string;
  sube?: string;
  oda?: string;
  pansiyon: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// EvciRequest Model
interface EvciRequest {
  studentId: string;
  startDate: Date;
  endDate: Date;
  destination: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
}
```

## 🔧 Development

### Available Scripts

#### Root Scripts
```bash
npm run dev          # Start development servers
npm run build        # Build all applications
npm run test         # Run all tests
npm run lint         # Lint all code
npm run clean        # Clean build artifacts
```

#### Client Scripts
```bash
cd client
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run lint         # Lint code
npm run type-check   # TypeScript type checking
```

#### Server Scripts
```bash
cd server
npm run dev          # Start with nodemon
npm run build        # Build TypeScript
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Lint code
npm run seed         # Seed database
```

### Code Style

#### TypeScript
- **Strict mode**: Enabled
- **No implicit any**: Enabled
- **No unused variables**: Enabled
- **Exact optional properties**: Enabled

#### ESLint Configuration
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

#### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### Testing

#### Test Structure
```
tests/
├── unit/            # Unit tests
├── integration/     # Integration tests
├── e2e/            # End-to-end tests
└── fixtures/       # Test data
```

#### Running Tests
```bash
# All tests
npm run test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

#### Test Examples
```typescript
// Unit test example
describe('AuthService', () => {
  it('should authenticate user with valid credentials', async () => {
    const result = await AuthService.authenticateUser('user123', 'password');
    expect(result.user).toBeDefined();
    expect(result.tokens).toBeDefined();
  });
});

// Integration test example
describe('Auth API', () => {
  it('should login user successfully', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ id: 'user123', sifre: 'password' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

## 🚀 Deployment

### Docker Deployment

#### 1. Build Images
```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build frontend
docker-compose build backend
```

#### 2. Run Containers
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d frontend
docker-compose up -d backend
```

#### 3. View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
```

### Kubernetes Deployment

#### 1. Apply Configurations
```bash
# Create namespace
kubectl apply -f k8s/production/namespace.yaml

# Deploy applications
kubectl apply -f k8s/production/frontend-deployment.yaml
kubectl apply -f k8s/production/backend-deployment.yaml
```

#### 2. Check Status
```bash
# Check pods
kubectl get pods -n tofas-fen-prod

# Check services
kubectl get services -n tofas-fen-prod

# Check logs
kubectl logs -f deployment/frontend -n tofas-fen-prod
```

## 📊 Monitoring

### Health Checks
```typescript
// Frontend health check
GET /health
Response: { status: 'ok', timestamp: '2024-01-15T10:30:00Z' }

// Backend health check
GET /api/health
Response: { 
  status: 'ok', 
  database: 'connected',
  redis: 'connected',
  timestamp: '2024-01-15T10:30:00Z'
}
```

### Metrics
```typescript
// Prometheus metrics
GET /metrics
Response: Prometheus format metrics

// Custom metrics
- http_requests_total
- http_request_duration_seconds
- active_users_total
- database_connections_active
```

### Logging
```typescript
// Winston logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

## 🔒 Security

### Authentication
- **JWT Tokens**: Access and refresh tokens
- **Token Blacklist**: Redis-based token revocation
- **Rate Limiting**: Per-endpoint rate limits
- **Password Hashing**: bcrypt with salt rounds

### Authorization
- **Role-based Access Control**: Granular permissions
- **Route Protection**: Middleware-based protection
- **Resource Ownership**: User can only access their data

### Input Validation
- **Express Validator**: Request validation
- **Joi Schemas**: Data validation
- **XSS Protection**: DOMPurify integration
- **SQL Injection**: Mongoose ODM protection

## 🐛 Debugging

### Frontend Debugging
```typescript
// React DevTools
// Install: https://chrome.google.com/webstore/detail/react-developer-tools

// Redux DevTools
// Install: https://chrome.google.com/webstore/detail/redux-devtools

// Console debugging
console.log('Debug info:', data);
console.table(data);
console.group('Group name');
console.groupEnd();
```

### Backend Debugging
```typescript
// Node.js debugging
node --inspect server/dist/index.js

// VS Code debugging
// Add to .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Server",
  "program": "${workspaceFolder}/server/dist/index.js",
  "env": {
    "NODE_ENV": "development"
  }
}
```

### Database Debugging
```typescript
// MongoDB debugging
mongoose.set('debug', true);

// Query logging
User.find({ rol: 'student' })
  .explain('executionStats')
  .then(stats => console.log(stats));
```

## 📚 API Reference

### Authentication Endpoints
```typescript
// Login
POST /api/auth/login
Body: { id: string, sifre: string }
Response: { success: boolean, user: User, tokens: Tokens }

// Logout
POST /api/auth/logout
Headers: { Authorization: 'Bearer <token>' }
Response: { success: boolean, message: string }

// Profile
GET /api/auth/profile
Headers: { Authorization: 'Bearer <token>' }
Response: { success: boolean, user: User }
```

### User Management Endpoints
```typescript
// Get all users
GET /api/users?page=1&limit=10&role=student
Headers: { Authorization: 'Bearer <token>' }
Response: { success: boolean, data: User[], pagination: Pagination }

// Create user
POST /api/users
Headers: { Authorization: 'Bearer <token>' }
Body: UserData
Response: { success: boolean, data: User }

// Update user
PUT /api/users/:id
Headers: { Authorization: 'Bearer <token>' }
Body: Partial<UserData>
Response: { success: boolean, data: User }
```

## 🤝 Contributing

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
git add .
git commit -m "feat: add new feature"

# Push branch
git push origin feature/new-feature

# Create pull request
# Merge after review
```

### Commit Convention
```
feat: add new feature
fix: fix bug
docs: update documentation
style: code formatting
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes
```

## 📞 Support

### Technical Support
- **Email**: dev-support@tofasfen.com
- **Slack**: #dev-support
- **GitHub Issues**: https://github.com/your-org/tofas-fen-webapp/issues

### Code Review
- **Reviewers**: @dev-team
- **Required Reviews**: 2
- **Auto-assign**: Enabled

### Documentation
- **API Docs**: https://api.tofasfen.com/docs
- **User Guide**: https://tofasfen.com/help
- **Developer Guide**: This document

---

## 📝 Changelog

### v1.0.0 (2024-01-15)
- Initial release
- Authentication system
- User management
- Evci request system
- Basic dashboard

### v1.1.0 (2024-01-20)
- Added notification system
- Improved error handling
- Performance optimizations
- Mobile responsiveness

---

*Bu dokümantasyon sürekli güncellenmektedir. En güncel bilgiler için lütfen GitHub repository'sini kontrol edin.*
