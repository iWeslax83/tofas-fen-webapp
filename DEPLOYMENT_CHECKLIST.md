# 🚀 Production Deployment Checklist

Bu checklist, TOFAS FEN Web Application'ı production ortamına deploy etmek için gerekli adımları içerir.

## ✅ Pre-Deployment Checklist

### 🔧 Environment Setup
- [ ] Production sunucusu hazırlandı
- [ ] Domain name alındı ve DNS ayarları yapıldı
- [ ] SSL sertifikası alındı (Let's Encrypt veya commercial)
- [ ] Environment variables konfigüre edildi
- [ ] Database backup stratejisi belirlendi

### 🔐 Security Configuration
- [ ] JWT secret'ları güçlü değerlerle değiştirildi
- [ ] Database şifreleri güçlü değerlerle değiştirildi
- [ ] CORS origin'leri production domain'leri ile güncellendi
- [ ] Rate limiting değerleri production için ayarlandı
- [ ] Security headers test edildi

### 🐳 Docker Configuration
- [ ] Docker images production için build edildi
- [ ] Docker Compose production konfigürasyonu hazırlandı
- [ ] Resource limits ayarlandı
- [ ] Health checks test edildi
- [ ] Logging konfigürasyonu yapıldı

### 📊 Monitoring Setup
- [ ] Prometheus konfigürasyonu yapıldı
- [ ] Grafana dashboards hazırlandı
- [ ] Alert rules tanımlandı
- [ ] Log aggregation (Loki) konfigüre edildi
- [ ] Backup monitoring ayarlandı

## 🚀 Deployment Steps

### 1. Environment Preparation
```bash
# 1. Environment dosyasını oluştur
cp env.production.template .env.production
# .env.production dosyasını düzenle

# 2. SSL sertifikalarını oluştur
./scripts/generate-ssl.sh yourdomain.com

# 3. MongoDB initialization script'ini hazırla
# mongo-init.js dosyası zaten hazır
```

### 2. Docker Deployment
```bash
# 1. Images'ları build et
./scripts/deploy.sh build

# 2. Production'a deploy et
./scripts/deploy.sh deploy

# 3. Health check yap
./scripts/deploy.sh status
```

### 3. Kubernetes Deployment (Optional)
```bash
# 1. Kubernetes cluster hazırla
kubectl create namespace tofas-fen

# 2. Secrets'ları oluştur
kubectl create secret generic tofas-secrets \
  --from-literal=mongodb-password=YOUR_MONGO_PASSWORD \
  --from-literal=jwt-secret=YOUR_JWT_SECRET \
  --from-literal=jwt-refresh-secret=YOUR_JWT_REFRESH_SECRET

# 3. ConfigMap'i oluştur
kubectl apply -f k8s/configmap.yaml

# 4. Deploy et
./scripts/deploy.sh deploy-k8s
```

## 🔍 Post-Deployment Verification

### ✅ Application Health
- [ ] Frontend erişilebilir (https://yourdomain.com)
- [ ] Backend API çalışıyor (https://yourdomain.com/api/health)
- [ ] Database bağlantısı aktif
- [ ] Redis cache çalışıyor
- [ ] WebSocket bağlantıları çalışıyor

### ✅ Security Tests
- [ ] HTTPS zorunlu (HTTP redirect test)
- [ ] Security headers kontrol edildi
- [ ] CORS policy test edildi
- [ ] Rate limiting test edildi
- [ ] Authentication flow test edildi

### ✅ Performance Tests
- [ ] Load testing yapıldı
- [ ] Response time'lar kabul edilebilir
- [ ] Memory usage normal
- [ ] CPU usage normal
- [ ] Database query performance test edildi

### ✅ Monitoring Verification
- [ ] Prometheus metrics toplanıyor
- [ ] Grafana dashboards çalışıyor
- [ ] Alerts aktif
- [ ] Log aggregation çalışıyor
- [ ] Backup işlemleri test edildi

## 🛠️ Maintenance Tasks

### Daily
- [ ] Application logs kontrol edildi
- [ ] Error rate kontrol edildi
- [ ] Performance metrics kontrol edildi
- [ ] Backup durumu kontrol edildi

### Weekly
- [ ] Security updates kontrol edildi
- [ ] Database performance analizi
- [ ] Log rotation kontrol edildi
- [ ] Disk space kontrol edildi

### Monthly
- [ ] SSL sertifika süresi kontrol edildi
- [ ] Security audit yapıldı
- [ ] Performance optimization review
- [ ] Backup restore test edildi

## 🚨 Emergency Procedures

### Application Down
1. Check container status: `docker-compose ps`
2. Check logs: `docker-compose logs -f`
3. Restart services: `./scripts/deploy.sh restart`
4. Check resources: `docker stats`

### Database Issues
1. Check MongoDB status: `docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"`
2. Check disk space: `df -h`
3. Restore from backup if needed: `./scripts/deploy.sh restore backup_file.tar.gz`

### High Load
1. Check monitoring dashboards
2. Scale up if needed: `docker-compose up -d --scale backend=3`
3. Check for memory leaks
4. Review recent changes

## 📞 Support Contacts

- **System Administrator**: admin@tofasfen.edu.tr
- **Development Team**: dev@tofasfen.edu.tr
- **Emergency Contact**: +90 XXX XXX XX XX

## 📚 Documentation Links

- [API Documentation](https://yourdomain.com/api/docs)
- [Monitoring Dashboard](https://yourdomain.com:3001)
- [Grafana Dashboard](https://yourdomain.com:3001)
- [Application Logs](https://yourdomain.com/logs)

---

**Last Updated**: $(date)
**Version**: 1.0.0
**Maintained by**: TOFAS FEN IT Team
