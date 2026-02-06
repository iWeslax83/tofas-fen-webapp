# SSL/HTTPS Yapılandırma Rehberi

Bu rehber, Tofaş Fen Lisesi Web Uygulaması için SSL/HTTPS yapılandırmasını açıklamaktadır.

## Mevcut Yapılandırma

Proje zaten SSL/HTTPS için yapılandırılmış durumda:

- ✅ `nginx/nginx.conf` - HTTPS (port 443) ve HTTP→HTTPS yönlendirmesi
- ✅ `docker-compose.yml` - Nginx SSL volume mount'u (`./nginx/ssl:/etc/nginx/ssl`)
- ✅ `env.production` - SSL sertifika path'leri tanımlı

## 🔐 Sertifika Oluşturma

### Seçenek 1: Self-Signed Sertifika (Development/Test)

#### Windows:
```powershell
# PowerShell ile
.\scripts\generate-ssl.ps1 -Domain "localhost"
```

#### Linux/Mac:
```bash
chmod +x scripts/generate-ssl.sh
./scripts/generate-ssl.sh localhost
```

#### Docker ile (tüm platformlar):
```bash
docker run --rm -v "${PWD}/nginx/ssl:/ssl" alpine sh -c "apk add openssl && openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /ssl/key.pem -out /ssl/cert.pem -subj '/CN=localhost'"
```

### Seçenek 2: Let's Encrypt (Production - ÖNERİLEN)

Production ortamı için ücretsiz Let's Encrypt sertifikası kullanın:

```bash
# Certbot kurulumu
sudo apt update
sudo apt install certbot

# Sertifika alma (domain'inizi değiştirin)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Sertifikaları nginx/ssl'e kopyalayın
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./nginx/ssl/key.pem
```

## 🚀 Production Deployment

### 1. Domain yapılandırması

`env.production` dosyasında domain'inizi güncelleyin:

```bash
BACKEND_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
```

### 2. Docker ile başlatma

```bash
# Production profiliyle başlat (nginx dahil)
docker-compose --profile production up -d

# Logları kontrol et
docker-compose logs -f
```

### 3. Sertifika yenileme (Let's Encrypt)

Let's Encrypt sertifikaları 90 gün geçerlidir. Otomatik yenileme için:

```bash
# Cron job ekle
sudo crontab -e

# Aşağıdaki satırı ekle (her gün 02:00'de kontrol)
0 2 * * * certbot renew --quiet && docker-compose restart nginx
```

## 📁 Dosya Yapısı

```
nginx/
├── nginx.conf          # Nginx yapılandırması (SSL dahil)
└── ssl/
    ├── cert.pem        # SSL sertifikası
    └── key.pem         # Private key
```

## ⚠️ Güvenlik Notları

1. **Private key'i asla paylaşmayın** - `key.pem` dosyası gizli tutulmalıdır
2. **.gitignore kontrol edin** - SSL dosyaları git'e commit edilmemeli
3. **Self-signed sertifika** - Tarayıcılar güvenlik uyarısı gösterecektir (sadece test için)
4. **Production için Let's Encrypt** - Gerçek sertifika kullanın

## 🔧 Sorun Giderme

### Sertifika hatası (ERR_CERT_AUTHORITY_INVALID)
- Self-signed sertifika kullanıyorsunuz, bu normal
- Tarayıcıda "Advanced" → "Proceed to site" seçeneğini kullanın

### Port 443 zaten kullanımda
```bash
# Hangi process kullanıyor bak
netstat -ano | findstr :443

# Process'i durdur veya docker-compose'daki port'u değiştir
```

### Nginx başlamıyor
```bash
# Log kontrol
docker-compose logs nginx

# Sertifika dosyalarını kontrol et
ls -la nginx/ssl/
```
