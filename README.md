# Tofas Fen Webapp

Modern, güvenli ve ölçeklenebilir web uygulaması. React, Node.js, MongoDB ve Docker teknolojileri kullanılarak geliştirilmiştir.

## 🚀 Özellikler

### 🔐 Güvenlik
- **JWT Token Management**: Güvenli kimlik doğrulama ve yetkilendirme
- **Password Policies**: Güçlü şifre politikaları ve doğrulama
- **Input Sanitization**: XSS ve injection saldırılarına karşı koruma
- **CSRF Protection**: Cross-Site Request Forgery koruması
- **Rate Limiting**: API rate limiting ve brute force koruması
- **Security Headers**: Güvenlik başlıkları ve CORS yapılandırması

### 🎨 Kullanıcı Deneyimi
- **Advanced Search/Filter**: Gelişmiş arama ve filtreleme özellikleri
- **Real-time Updates**: WebSocket tabanlı gerçek zamanlı güncellemeler
- **Offline Support**: Progressive Web App (PWA) özellikleri
- **Responsive Design**: Mobil uyumlu tasarım
- **Modern UI**: Framer Motion animasyonları

### 🧪 Test ve Kalite
- **Unit Tests**: Vitest ile kapsamlı unit testler
- **Integration Tests**: API entegrasyon testleri
- **Performance Tests**: Yük testleri ve performans ölçümleri
- **Security Tests**: Güvenlik testleri ve penetrasyon testleri
- **Code Coverage**: Test coverage raporları

### 🚀 Deployment ve DevOps
- **Docker Containerization**: Multi-stage Docker build
- **Kubernetes**: Production-ready Kubernetes deployment
- **CI/CD Pipeline**: GitHub Actions ile otomatik deployment
- **Load Balancing**: Nginx load balancer
- **Auto-scaling**: Horizontal Pod Autoscaler (HPA)
- **Monitoring**: Health checks ve monitoring

## 🛠️ Teknolojiler

### Frontend
- **React 19**: Modern React hooks ve functional components
- **TypeScript**: Tip güvenliği
- **Vite**: Hızlı build tool
- **Framer Motion**: Animasyonlar
- **Axios**: HTTP client
- **React Router**: Client-side routing
- **DOMPurify**: XSS koruması

### Backend
- **Node.js**: Server-side JavaScript
- **Express.js**: Web framework
- **MongoDB**: NoSQL database
- **Mongoose**: MongoDB ODM
- **JWT**: JSON Web Tokens
- **bcryptjs**: Password hashing
- **express-rate-limit**: Rate limiting

### DevOps
- **Docker**: Containerization
- **Kubernetes**: Orchestration
- **Nginx**: Reverse proxy ve load balancer
- **GitHub Actions**: CI/CD
- **Vitest**: Testing framework

## 📦 Kurulum

### Gereksinimler
- Node.js 18+
- Docker ve Docker Compose
- MongoDB (opsiyonel, Docker ile gelir)

### Geliştirme Ortamı

1. **Repository'yi klonlayın**
```bash
git clone https://github.com/your-username/tofas-fen-webapp.git
cd tofas-fen-webapp
```

2. **Frontend kurulumu**
```bash
cd client
npm install
npm run dev
```

3. **Backend kurulumu**
```bash
cd ../server
npm install
npm run dev
```

4. **Environment değişkenlerini ayarlayın**
```bash
# server/.env
MONGODB_URI=mongodb://localhost:27017/tofas-fen
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
PORT=3001
```

### Docker ile Kurulum

1. **Tüm servisleri başlatın**
```bash
docker-compose up -d
```

2. **Uygulamaya erişin**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- MongoDB: localhost:27017

## 🧪 Testler

### Frontend Testleri
```bash
cd client
npm run test              # Testleri çalıştır
npm run test:coverage     # Coverage raporu
npm run test:watch        # Watch mode
```

### Backend Testleri
```bash
cd server
npm run test              # Testleri çalıştır
npm run test:coverage     # Coverage raporu
npm run test:watch        # Watch mode
```

### Performance Testleri
```bash
cd server
npm run test performance  # Performance testleri
```

### Security Testleri
```bash
cd server
npm run test security     # Security testleri
```

## 🚀 Production Deployment

### Production Preparation

**Before deploying to production, run the preparation script:**
```bash
# Generate secure secrets
node scripts/generate-secrets.js

# Run production preparation checklist (Linux/Mac)
./scripts/prepare-production.sh

# Or on Windows (PowerShell)
node scripts/generate-secrets.js
```

**📚 For detailed production deployment guide, see:**
- [Production Deployment Guide](docs/PRODUCTION_DEPLOYMENT.md)

### Docker ile Deployment

1. **Production build**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

2. **Environment değişkenlerini ayarlayın**
```bash
# Create .env file with production values
# See docs/PRODUCTION_DEPLOYMENT.md for complete list

# Required environment variables:
NODE_ENV=production
MONGO_PASSWORD=your-strong-mongodb-password
JWT_SECRET=your-generated-jwt-secret
JWT_REFRESH_SECRET=your-generated-refresh-secret
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
```

### Kubernetes ile Deployment

1. **Kubernetes cluster'ınızı hazırlayın**

2. **Secrets ve ConfigMaps'i güncelleyin**
```bash
# k8s/secret.yaml dosyasını güncelleyin
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml
```

3. **Uygulamayı deploy edin**
```bash
./scripts/deploy.sh deploy
```

4. **Deployment durumunu kontrol edin**
```bash
./scripts/deploy.sh status
```

### CI/CD Pipeline

GitHub Actions otomatik olarak:
- Testleri çalıştırır
- Security scan yapar
- Docker image'ları build eder
- Production'a deploy eder

## 📊 Monitoring ve Logging

### Health Checks
- Frontend: `GET /health`
- Backend: `GET /health`
- Database: MongoDB connection check

### Logging
- Application logs: `./logs/`
- Nginx access logs
- Error tracking

### Metrics
- CPU ve Memory kullanımı
- Response time
- Error rate
- Throughput

## 🔧 Konfigürasyon

### Environment Variables

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

#### Backend (.env)
```env
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/tofas-fen
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### Nginx Konfigürasyonu
- Gzip compression
- Security headers
- SSL/TLS termination
- Load balancing
- Caching

## 🛡️ Güvenlik

### Implemented Security Features
- JWT token authentication
- Password hashing (bcrypt)
- Input sanitization
- XSS protection
- CSRF protection
- Rate limiting
- Security headers
- CORS configuration

### Security Best Practices
- Environment variables for secrets
- HTTPS enforcement
- Regular security updates
- Dependency scanning
- Code review process

## 📈 Performance

### Optimization Techniques
- Code splitting
- Lazy loading
- Image optimization
- Gzip compression
- Caching strategies
- Database indexing

### Monitoring
- Response time tracking
- Memory usage monitoring
- CPU utilization
- Database performance

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakın.

## 📞 İletişim

- **Email**: weslax83@gmail.com
- **GitHub**: [@your-username](https://github.com/iWeslax83)

## 🙏 Teşekkürler

Bu projede kullanılan tüm açık kaynak kütüphanelere teşekkürler.
