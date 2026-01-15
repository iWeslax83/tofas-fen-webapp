# Production Deployment Guide

This guide covers all steps required to deploy the application to production.

## 📋 Pre-Deployment Checklist

### 1. Security Configuration

#### ✅ Generate Strong Secrets

**JWT Secrets** (minimum 32 characters):
```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**MongoDB Password**:
```bash
# Generate strong MongoDB password
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
```

#### ✅ Update Environment Variables

Create `server/.env` for production:
```env
NODE_ENV=production

# Database Configuration
MONGODB_URI=mongodb://admin:YOUR_STRONG_PASSWORD@mongodb:27017/tofas-fen?authSource=admin

# Server Configuration
PORT=3001
BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Security Configuration (USE GENERATED SECRETS ABOVE)
SESSION_SECRET=your-generated-session-secret-here
JWT_SECRET=your-generated-jwt-secret-here
JWT_REFRESH_SECRET=your-generated-refresh-secret-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com

# Redis Configuration
REDIS_URL=redis://redis:6379
# OR for external Redis (Upstash, etc.):
# REDIS_URL=rediss://default:YOUR_PASSWORD@your-redis-host.upstash.io:6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=400
AUTH_RATE_LIMIT_MAX=5
UPLOAD_RATE_LIMIT_MAX=10

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4,video/mov,application/pdf

# Email Configuration (Required for password reset, notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=noreply@yourdomain.com

# MEB E-okul Integration (If needed)
MEB_EOKUL_BASE_URL=https://eokul.meb.gov.tr
MEB_EOKUL_API_KEY=your-meb-eokul-api-key
MEB_EOKUL_USERNAME=your-meb-eokul-username
MEB_EOKUL_PASSWORD=your-meb-eokul-password

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Monitoring Configuration
ENABLE_MONITORING=true
METRICS_PORT=9090
SENTRY_DSN=your-sentry-dsn-if-using-sentry
```

Create root `.env` for Docker Compose:
```env
# Required for docker-compose.yml
MONGO_PASSWORD=your-strong-mongodb-password
JWT_SECRET=your-generated-jwt-secret
JWT_REFRESH_SECRET=your-generated-refresh-secret
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
WS_URL=wss://api.yourdomain.com
CORS_ORIGIN=https://yourdomain.com
```

### 2. Frontend Configuration

Create `client/.env.production`:
```env
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
```

### 3. Database Setup

#### ✅ MongoDB Production Configuration

1. **Enable Authentication** (already configured in docker-compose.yml)
2. **Create Database Backup Script**:
```bash
# Create backup
docker exec tofas-mongodb mongodump --out /backup/$(date +%Y%m%d)
```

3. **Set up Replication** (for high availability):
```yaml
# In docker-compose.prod.yml, add:
mongodb:
  command: mongod --replSet rs0
```

### 4. SSL/HTTPS Configuration

#### ✅ Obtain SSL Certificate

**Option 1: Let's Encrypt (Free)**
```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com
```

**Option 2: Cloud Provider SSL** (AWS, GCP, Azure, etc.)

#### ✅ Configure Nginx with SSL

Update `nginx/nginx.conf`:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Redirect HTTP to HTTPS
    if ($scheme != "https") {
        return 301 https://$host$request_uri;
    }
}
```

### 5. Build and Test

#### ✅ Build Frontend
```bash
cd client
npm run build
# Test the build
npm run preview
```

#### ✅ Build Backend
```bash
cd server
npm run build
# Test the build
npm start
```

#### ✅ Run Tests
```bash
# Backend tests
cd server
npm test

# Frontend tests
cd client
npm test

# E2E tests
npm run test:e2e
```

### 6. Docker Production Build

#### ✅ Build Production Images
```bash
# Build all services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Or build individually
docker-compose build backend
docker-compose build frontend
```

#### ✅ Test Docker Containers Locally
```bash
# Start with production config
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check logs
docker-compose logs -f

# Test health endpoints
curl http://localhost:3001/health
curl http://localhost:3000/health
```

### 7. Kubernetes Deployment (If using K8s)

#### ✅ Update Secrets
```bash
# Encode secrets (base64)
echo -n "your-mongodb-password" | base64
echo -n "your-jwt-secret" | base64

# Update k8s/secret.yaml with encoded values
kubectl apply -f k8s/secret.yaml
```

#### ✅ Deploy to Kubernetes
```bash
# Apply all configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n tofas-fen
kubectl get services -n tofas-fen
```

### 8. Monitoring and Logging

#### ✅ Set Up Logging
- Application logs: `./logs/app.log`
- Docker logs: `docker-compose logs -f`
- Kubernetes logs: `kubectl logs -f <pod-name>`

#### ✅ Set Up Monitoring
- Health checks: `/health` endpoint
- Metrics: `/metrics` endpoint (if enabled)
- Error tracking: Sentry (if configured)

### 9. Security Hardening

#### ✅ Review Security Checklist
- [ ] All secrets are in environment variables (not hardcoded)
- [ ] HTTPS is enabled and enforced
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Input validation is in place
- [ ] SQL/NoSQL injection protection
- [ ] XSS protection enabled
- [ ] CSRF protection enabled
- [ ] Security headers configured
- [ ] Dependencies are up to date
- [ ] No debug routes in production
- [ ] No console.log in production code

#### ✅ Run Security Audit
```bash
# Backend
cd server
npm audit
npm audit fix

# Frontend
cd client
npm audit
npm audit fix
```

### 10. Performance Optimization

#### ✅ Frontend Optimization
- [ ] Code splitting enabled
- [ ] Lazy loading implemented
- [ ] Images optimized
- [ ] Gzip compression enabled
- [ ] Service worker configured
- [ ] Bundle size optimized

#### ✅ Backend Optimization
- [ ] Database indexes created
- [ ] Redis caching enabled
- [ ] Response compression enabled
- [ ] Connection pooling configured
- [ ] Query optimization done

### 11. Backup Strategy

#### ✅ Database Backups
```bash
# Automated backup script (add to cron)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec tofas-mongodb mongodump --out /backup/$DATE
# Upload to cloud storage (S3, etc.)
```

#### ✅ File Uploads Backup
- Set up automated backup for `uploads/` directory
- Consider using cloud storage (S3, GCS, Azure Blob)

### 12. Documentation

#### ✅ Update Documentation
- [ ] API documentation updated
- [ ] Deployment guide reviewed
- [ ] Environment variables documented
- [ ] Troubleshooting guide created

## 🚀 Deployment Steps

### Option 1: Docker Compose Deployment

```bash
# 1. Set environment variables
export MONGO_PASSWORD=your-strong-password
export JWT_SECRET=your-jwt-secret
export JWT_REFRESH_SECRET=your-refresh-secret
export FRONTEND_URL=https://yourdomain.com
export BACKEND_URL=https://api.yourdomain.com

# 2. Build and start
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 3. Check status
docker-compose ps
docker-compose logs -f
```

### Option 2: Kubernetes Deployment

```bash
# 1. Create namespace
kubectl create namespace tofas-fen

# 2. Apply secrets and configmaps
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml

# 3. Deploy services
kubectl apply -f k8s/production/

# 4. Check status
kubectl get all -n tofas-fen
```

## 🔍 Post-Deployment Verification

### ✅ Health Checks
```bash
# Backend health
curl https://api.yourdomain.com/health

# Frontend health
curl https://yourdomain.com/health

# Database connection
curl https://api.yourdomain.com/status
```

### ✅ Functionality Tests
- [ ] User registration works
- [ ] User login works
- [ ] Password reset works
- [ ] File upload works
- [ ] API endpoints respond correctly
- [ ] WebSocket connections work
- [ ] Email sending works (if configured)

### ✅ Performance Tests
- [ ] Response times are acceptable
- [ ] No memory leaks
- [ ] Database queries are optimized
- [ ] Caching is working

## 🛠️ Troubleshooting

### Common Issues

**1. MongoDB Connection Error**
```bash
# Check MongoDB is running
docker-compose ps mongodb

# Check connection string
echo $MONGODB_URI

# Test connection
docker exec tofas-mongodb mongosh --eval "db.adminCommand('ping')"
```

**2. Redis Connection Error**
```bash
# Check Redis is running
docker-compose ps redis

# Test Redis connection
docker exec tofas-redis redis-cli ping
```

**3. Frontend Not Loading**
```bash
# Check build output
ls -la client/dist/

# Check Nginx configuration
docker-compose exec nginx nginx -t

# Check frontend logs
docker-compose logs frontend
```

**4. SSL Certificate Issues**
```bash
# Check certificate validity
openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout

# Test SSL connection
openssl s_client -connect yourdomain.com:443
```

## 📊 Monitoring Checklist

- [ ] Application logs are being collected
- [ ] Error tracking is configured (Sentry, etc.)
- [ ] Performance metrics are being tracked
- [ ] Database performance is monitored
- [ ] Server resources are monitored (CPU, Memory, Disk)
- [ ] Uptime monitoring is configured
- [ ] Alerting is set up for critical issues

## 🔄 Maintenance

### Regular Tasks
- [ ] Weekly security updates
- [ ] Monthly dependency updates
- [ ] Quarterly security audit
- [ ] Regular backup verification
- [ ] Performance optimization review

## 📞 Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review documentation: `docs/`
- Check GitHub issues
- Contact: weslax83@gmail.com
