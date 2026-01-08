# 🔧 Hata Çözüm Rehberi - "Failed to fetch" Hatası

## Sorun
Login yaparken "Failed to fetch" hatası alınıyor.

## Olası Nedenler ve Çözümler

### 1. Backend Çalışmıyor ❌
**Kontrol:**
```bash
cd server
npm run dev
```

**Beklenen:** Backend `http://localhost:3001` adresinde çalışmalı

**Test:**
```bash
curl http://localhost:3001/health
```

### 2. CORS Sorunu ❌
**Kontrol:**
- Backend'de `CORS_ORIGIN` environment variable doğru mu?
- Frontend `http://localhost:5173` adresinde çalışıyor mu?

**Çözüm:**
```bash
# server/.env dosyasında:
CORS_ORIGIN=http://localhost:5173
```

### 3. Cookie Ayarları ❌
**Kontrol:**
- Backend'de `credentials: true` ayarı var mı? ✅ (Yapıldı)
- Frontend'de `withCredentials: true` ayarı var mı? ✅ (Yapıldı)

### 4. Environment Variables ❌
**Kontrol:**
```bash
# client/.env dosyası var mı?
VITE_API_URL=http://localhost:3001
```

**Oluştur:**
```bash
cd client
cp env.example .env
```

### 5. Network/Firewall ❌
**Kontrol:**
- Port 3001 açık mı?
- Firewall backend'e erişimi engelliyor mu?

## Hızlı Test Adımları

### Adım 1: Backend Kontrolü
```bash
cd server
npm run dev
# Terminal'de "Server running on http://localhost:3001" görmelisiniz
```

### Adım 2: Frontend Kontrolü
```bash
cd client
npm run dev
# Terminal'de "Local: http://localhost:5173" görmelisiniz
```

### Adım 3: Browser Console Kontrolü
1. Browser DevTools → Console
2. Login sayfasına gidin
3. Console'da hata mesajlarını kontrol edin

### Adım 4: Network Tab Kontrolü
1. Browser DevTools → Network
2. Login yapmayı deneyin
3. `/health` ve `/api/auth/login` isteklerini kontrol edin
4. Status code'ları kontrol edin:
   - 200: ✅ Başarılı
   - 401: ❌ Authentication hatası
   - 403: ❌ CORS hatası
   - 500: ❌ Server hatası
   - Failed: ❌ Network hatası

## Debug Komutları

### Backend Log Kontrolü
```bash
cd server
# Log dosyalarını kontrol edin
tail -f logs/combined.log
```

### Frontend API Test
Browser Console'da:
```javascript
// Health check
fetch('http://localhost:3001/health', {
  credentials: 'include'
}).then(r => r.json()).then(console.log)

// Login test
fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 'test', sifre: 'test' })
}).then(r => r.json()).then(console.log)
```

## Yapılan Düzeltmeler

1. ✅ Health check'te `credentials: 'include'` eklendi
2. ✅ Health check endpoint düzeltildi (`/health` doğru)
3. ✅ Hata mesajları iyileştirildi
4. ✅ CORS `credentials: true` ayarı yapıldı

## Sonraki Adımlar

Eğer hala sorun varsa:
1. Browser console'daki tam hata mesajını paylaşın
2. Network tab'ındaki request/response detaylarını paylaşın
3. Backend log'larını kontrol edin

