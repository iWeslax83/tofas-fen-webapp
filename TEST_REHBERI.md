# 🧪 Test Rehberi - Güvenlik İyileştirmeleri

## Yapılan Değişiklikler

### 1. Service Worker PII Protection ✅
- **Dosya**: `client/public/sw.js`
- **Özellik**: Sensitive endpoint'ler cache'den hariç tutuldu
- **Test**: Service worker'ın doğru çalıştığını kontrol edin

### 2. httpOnly Cookie Authentication ✅
- **Backend**: Token'lar artık httpOnly cookie'de
- **Frontend**: `withCredentials: true` ile cookie gönderimi
- **Test**: Login/logout/refresh token akışını test edin

## Test Senaryoları

### Backend Testleri

```bash
cd server
npm test
```

**Beklenen Sonuçlar**:
- ✅ Login endpoint httpOnly cookie set ediyor
- ✅ Refresh token endpoint cookie güncelliyor
- ✅ Logout endpoint cookie temizliyor
- ✅ JWT middleware cookie'den token okuyor

### Frontend Testleri

```bash
cd client
npm test
```

**Manuel Test Senaryoları**:

1. **Login Testi**:
   - Login sayfasına gidin
   - Geçerli credentials ile giriş yapın
   - Browser DevTools → Application → Cookies
   - `accessToken` ve `refreshToken` cookie'lerinin httpOnly olduğunu kontrol edin
   - Response body'de token olmamalı (sadece expiry bilgisi)

2. **Service Worker Testi**:
   - Browser DevTools → Application → Service Workers
   - Service worker'ın aktif olduğunu kontrol edin
   - Network tab'ında sensitive endpoint'lere istek atın
   - Cache'de olmamalı (X-Cache: BLOCKED header'ı olmalı)

3. **Offline Testi**:
   - Network tab'ında "Offline" modunu aktif edin
   - Sensitive endpoint'lere istek atın
   - "Offline - sensitive data not available" hatası almalısınız
   - Public endpoint'ler (meals, announcements) cache'den gelmeli

4. **Token Refresh Testi**:
   - Login yapın
   - 15 dakika bekleyin (veya token'ı manuel expire edin)
   - API isteği yapın
   - Otomatik refresh çalışmalı
   - Yeni cookie'ler set edilmeli

5. **Logout Testi**:
   - Login yapın
   - Logout yapın
   - Cookies temizlenmeli
   - Tekrar API isteği yapın → 401 almalısınız

## Hata Ayıklama

### Cookie Gönderilmiyor
- ✅ CORS `credentials: true` kontrol edin
- ✅ Frontend `withCredentials: true` kontrol edin
- ✅ Cookie domain/path ayarlarını kontrol edin

### Service Worker Çalışmıyor
- ✅ `sw.js` dosyasının `/public` klasöründe olduğunu kontrol edin
- ✅ Service worker registration kodunu kontrol edin
- ✅ Browser console'da hata var mı kontrol edin

### Test Başarısız
- ✅ `cookie-parser` package'ının yüklü olduğunu kontrol edin
- ✅ Backend'de cookie middleware'in doğru sırada olduğunu kontrol edin
- ✅ Test'lerde cookie göndermeyi unutmayın

## Migration Notları

⚠️ **Backward Compatibility**: 
- Mevcut kod hala localStorage token'ları destekliyor
- Yeni kod httpOnly cookie kullanıyor
- İki yöntem de çalışıyor (migration dönemi için)
- Production'a geçmeden önce localStorage desteği kaldırılmalı

## Sonraki Adımlar

1. ✅ Test'leri çalıştırın
2. ✅ Manuel test senaryolarını uygulayın
3. ✅ Hataları düzeltin
4. ⏭️ React Hook Form + Zod entegrasyonuna geçin

