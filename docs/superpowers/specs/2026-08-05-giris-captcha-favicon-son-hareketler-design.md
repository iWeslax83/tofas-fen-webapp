# Üç düzeltme: giriş CAPTCHA'sı, sekme logosu, Son Hareketler

Tarih: 2026-08-05
Durum: tasarım onaylandı, uygulama bekliyor

Birbirinden bağımsız üç hata, üç ayrı PR.

---

## 1. Giriş sayfasında çözülemeyen CAPTCHA

### Bulgu

`authRoutes.ts:52` login route'una `captchaMiddleware` bağlı. Middleware
(`server/src/middleware/captcha.ts`) **IP başına** 15 dakikalık pencerede 3
başarısız girişten sonra 429 döner ve gövdede
`{ captchaRequired: true, captchaToken, captchaQuestion }` gönderir.

İstemcide CAPTCHA'ya dair **tek satır kod yok** (`grep -rni captcha client/src`
boş). Kullanıcı sadece "CAPTCHA gerekli" hatasını görür, ekranda çözecek bir
şey olmadığı için giriş yapamaz.

Aynı dosyadaki iki ek sorun:

- Sayaç IP başına. Okul tek NAT IP'nin arkasındaysa üç kişinin şifreyi yanlış
  girmesi tüm okulu kilitler.
- Sayaç süreç belleğinde (`Map`). Render'da yeniden başlatmada sıfırlanır,
  birden fazla instance'ta tutarsız davranır.

### Karar: CAPTCHA tamamen kaldırılır

Yerine geçen korumalar zaten var ve çalışıyor:

- `authLimiter`: IP başına istek hızı sınırı
- Hesap kilidi: `authService.ts:119-121`, 5 başarısız denemede
  `lockUntil` doldurulur; başarılı girişte sıfırlanır (`153-155`)

IP başına CAPTCHA, paylaşılan okul IP'si altında yanlış araç.

### Değişiklikler

- `authRoutes.ts`: `captchaMiddleware` import'u (satır 8) ve login
  route'undaki kullanımı (satır 52) çıkar
- `authService.ts`: `trackFailedLogin` / `resetFailedLogin` import'u (11) ve
  çağrıları (140, 149) çıkar
- `server/src/middleware/captcha.ts` silinir (içindeki dakikalık `setInterval`
  de gider)
- `server/src/test/unit/captcha.test.ts` silinir
- `server/src/routes/__tests__/auth.test.ts` içindeki captcha beklentileri
  temizlenir

### Doğrulama

Sunucu testleri yeşil. Ayrıca el ile: aynı hesaba 5 kez yanlış şifre gir,
hesabın kilitlendiğini ve mesajın anlaşılır olduğunu gör; doğru şifreyle
girişin 3. denemeden sonra da çalıştığını gör.

---

## 2. Sekmede logo görünmüyor

### Bulgu

`client/index.html:5`:

```html
<link rel="icon" type="image/svg+xml" href="/vite.svg" />
```

`client/public/vite.svg` **yok**. Tarayıcı 404 alıp varsayılan simgeyi gösterir.

`apple-touch-icon` ve `manifest.webmanifest` `/tofaslogo.png`'yi gösteriyor; o
dosya var ama 250x298, yani kare değil ve manifest'in "192x192 / 512x512"
iddiası yanlış. Manifest'te ikisi tek girdide `"purpose": "any maskable"` ile
birleşik, maskable için gereken iç boşluk yok, dolayısıyla Android'de logo
kırpılır.

Ayrıca `manifest.theme_color` ve `<meta name="theme-color">` `#0f766e`
(turkuaz), sitenin vurgu rengi ise `--accent: #c8102e` (kırmızı).

### Değişiklikler

ImageMagick ile `tofaslogo.png`'den kare, şeffaf kenar boşluklu setler üretilir,
`client/public/icons/` altına:

| Dosya                   | Kullanım                                      |
| ----------------------- | --------------------------------------------- |
| `favicon-32.png`        | sekme simgesi                                 |
| `favicon-180.png`       | apple-touch-icon                              |
| `icon-192.png`          | manifest, `purpose: any`                      |
| `icon-512.png`          | manifest, `purpose: any`                      |
| `icon-512-maskable.png` | manifest, `purpose: maskable`, ~%12 iç boşluk |

- `index.html`: ölü `/vite.svg` satırı gider, 32'lik png + 180'lik
  apple-touch-icon eklenir
- `manifest.webmanifest`: gerçek boyutlara işaret eden ikon listesi, `any` ve
  `maskable` ayrı girdiler; kısayol ikonları da düzeltilir
- `theme_color` ve `<meta name="theme-color">` `#c8102e` olur

### Doğrulama

`vite build` sonrası `dist/` içinde ikonların bulunduğunu doğrula, tarayıcıda
sert yenilemeyle (service worker cache'i nedeniyle) sekme simgesini gör.

---

## 3. Son Hareketler'de eski ve silinmiş kayıtlar

### Elenenler

- Silme işlemleri kalıcı: `Announcement.ts:467` ve `Homework.ts:702`
  `findByIdAndDelete` kullanıyor, yumuşak silme yok
- `/api/dashboard/overview` üzerinde sunucu tarafı cache yok
  (`routes/Dashboard.ts:58`, controller'da Redis kullanımı yok)
- Service worker o yolu cache'lemiyor: `sw.js` API için network-first, cache
  yalnızca ağ hatasında ve 5 dakikalık yaşla devreye giriyor

### Kalan iki neden

1. **İstemci cache'i.** `['dashboard', 'overview']` sorgusu hiçbir mutasyondan
   sonra invalidate edilmiyor, `staleTime: 60_000`. Duyuru silindikten sonra
   panele dönülürse 60 saniye boyunca eski liste görünür.
2. **Sunucu sorgularında filtre eksikliği.** `dashboardService.ts` akışlarında
   tarih penceresi yok (aylar öncesi duyuru "son hareket" sayılıyor), öğretmen
   akışı ödevleri `status` ve `isPublished` ayrımı yapmadan çekiyor.

İkisi de düzeltilir.

### İstemci değişiklikleri

`useDashboardOverview`: `staleTime: 0` + `refetchOnMount: 'always'`.

Not: duyuru, ödev ve dilekçe sayfaları React Query kullanmıyor
(`DuyurularPage.tsx` `useState` + `AnnouncementService.deleteAnnouncement`,
`OdevlerPage.tsx` `HomeworkService`), yani `invalidateQueries` eklenecek bir
mutasyon yok. Silme işleminden sonra kullanıcı panele döndüğünde
`ModernDashboard` yeniden mount olur; `refetchOnMount: 'always'` bu anda taze
veri çeker, sorunu kapatan da budur. Sayfaları React Query'ye taşımak ayrı bir
iş, bu düzeltmenin kapsamında değil.

### Sunucu değişiklikleri (`dashboardService.ts`)

- Tüm akış sorgularına 30 günlük pencere (`createdAt` / `assignedDate` /
  `lastUpdated` >= now - 30 gün)
- Öğretmen akışındaki ödevlere `status: { $ne: 'expired' }` ve
  `isPublished: true` (yayınlanmamış taslak "Ödev verildi" diye görünmemeli)
- Öğrenci ödev akışına `status: { $ne: 'expired' }`
- Yönetici akışındaki kayıt başvuruları ve dilekçeler değişmez; durum bilgisi
  zaten satır metninde yazıyor

### Doğrulama

`dashboardService` için filtre testleri (30 günden eski kayıt gelmiyor,
süresi geçmiş ödev gelmiyor, yayınlanmamış ödev gelmiyor).

Ardından el ile: bir duyuru sil, panele dön, kaybolduğunu gör; sert yenileme
sonrası hâlâ duran bir kayıt kalırsa neden bu iki maddenin dışındadır, o
durumda veritabanına bakılır. Bu düzeltmeler silmeyi taklit etmiyor, sadece
tarih ve durum bazlı süzüyor, dolayısıyla gerçek bir hatayı maskelemez.
