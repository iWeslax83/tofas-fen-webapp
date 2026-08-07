# Kullanıcı şifre değiştirme + güç göstergesi

Tarih: 2026-08-05
Durum: tasarım onaylandı, uygulama bekliyor

## Sorun

Kullanıcılara admin tarafından rastgele üretilmiş şifreler dağıtılıyor
(`passwordAdmin` modülü, `passwordGenerator.ts`, 8 karakter). Kullanıcının bu
şifreyi kendi seçtiği bir şifreyle değiştirmesinin **hiçbir yolu yok**.

`authValidators.ts` içinde `validateChangePassword` tanımlı ama hiçbir route
onu kullanmıyor, yani ölü kod. GraphQL şemasında `# changePassword kaldırıldı`
notu var. Var olan tek şifre değiştirme yolu e-posta token'lı
`/forgot-password` + `/reset-password` akışı, o da e-postası doğrulanmış
kullanıcılarla sınırlı.

## Kararlar

| Konu             | Karar                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Yerleşim         | Ayarlar sayfasında gönüllü bölüm + panelde kapatılabilir hatırlatma bandı (zorunlu değişim yok)                            |
| Tespit           | `User.passwordSelfChangedAt` tarih alanı                                                                                   |
| Politika         | Tek sert kural: 6-100 karakter. Büyük/küçük harf ve rakam zorunluluğu kaldırılır, `/reset-password` de aynı hizaya çekilir |
| Güç ölçer        | Kendi yazdığımız saf fonksiyon, sıfır bağımlılık. Tavsiye niteliğinde, kaydetmeyi engellemez                               |
| Oturumlar        | `tokenVersion` artar (diğer cihazlar refresh'te düşer), işlemi yapan cihaz yanıtla yeni token çifti alır                   |
| Kayıt            | `PasswordAuditLog`'a `self_change`, e-posta bildirimi, rate limit                                                          |
| Sunucu yerleşimi | Mevcut `auth` modülü (A seçeneği)                                                                                          |

## Sunucu tasarımı

### Şema

`server/src/models/User.ts`:

```ts
passwordSelfChangedAt?: Date;  // index'siz
```

Türetilen bayrak:

```
usingDistributedPassword =
  !passwordSelfChangedAt || passwordSelfChangedAt < passwordLastSetAt
```

`passwordLastSetAt` admin şifre yazdığında güncelleniyor (`passwordAdminService.ts:56, 85, 149, 328`),
yani admin reset attığında bayrak kendiliğinden tekrar true olur. Migration
gerekmez: alanı boş olan mevcut kullanıcılar "dağıtılan şifreyi kullanıyor"
sayılır, ki doğrusu da bu.

### Endpoint

`POST /api/auth/change-password`, `authRoutes.ts` içinde, `authenticateJWT` +
`authLimiter` arkasında. Gövde: `{ currentPassword, newPassword }`.

1. `validateChangePassword` (gevşetilmiş: sadece 6-100 karakter)
2. Kullanıcıyı `.select('+sifre')` ile çek
3. `currentPassword` doğrula: `sifre` doluysa bcrypt karşılaştır; boşsa mevcut
   TCKN fallback mantığı (`authService.ts:107`) ile karşılaştır, çünkü hiç
   şifresi olmayan kullanıcı TCKN'siyle giriyor
4. `newPassword === currentPassword` ise 400
5. `bcrypt.hash(newPassword, BCRYPT_COST)`, `passwordSelfChangedAt = now`,
   `tokenVersion += 1`, kaydet
6. `recordPasswordEvent({ action: 'self_change', reason: 'other' })`
7. Kullanıcının e-postası varsa "şifren değiştirildi" bildirimi (`sendMail`).
   Hata yutulur, isteği düşürmez.
8. Yanıt: `AuthController.login` ile birebir aynı çerez yazımı. `tokenVersion`
   arttığı için eski `accessToken`/`refreshToken` çerezleri geçersizleşir;
   işlemi yapan cihazın düşmemesi için yeni token çifti `httpOnly` çerez olarak
   yazılır (`authController.ts:101-118`) ve yeni `csrfToken` gövdede döner
   (çapraz alan SPA çerezi okuyamıyor, `issueCsrfToken` kalıbı).

### Yan değişiklikler

- `PasswordAuditLog.ts`: `PasswordAuditAction`'a `'self_change'` eklenir. Bu
  action'da admin alanları boş kalacağı için şemada admin alanlarının
  zorunluluğu `self_change` için opsiyonele çekilir.
- `authService.validatePasswordStrength`: büyük harf / küçük harf / rakam
  kontrolleri kaldırılır, 6-100 karakter kalır.
- `validateResetPassword`: aynı gevşetme.
- `toAuthUserPayload(user)` yardımcısı: `authService.ts` içinde 5 yerde
  (`182, 246, 275, 424, 823`) tekrarlanan kullanıcı alan listesi tek fonksiyona
  çıkar, içine `usingDistributedPassword` eklenir. `/me` (`routes/User.ts:670`)
  aynı alanı döner.

## İstemci tasarımı

### `client/src/utils/passwordStrength.ts`

```ts
export type StrengthLevel = 0 | 1 | 2 | 3; // Çok zayıf / Zayıf / Orta / Güçlü
export function scorePassword(
  pw: string,
  userHints?: string[],
): {
  level: StrengthLevel;
  label: string;
  hint: string;
};
```

Puanlama: uzunluk kademeleri (6 / 8 / 12 / 16), karakter sınıfı çeşitliliği
(küçük, büyük, rakam, sembol). Cezalar: tek karakter tekrarı (`aaaaaa`),
ardışık dizi (`123456`, `abcdef`, `qwerty`), Türkçe yaygın şifre listesi
(~50 giriş), kullanıcının id'sini veya adını içermesi. `hint` tek cümlelik
somut öneri.

### `client/src/components/ui/PasswordStrengthMeter.tsx`

Input altında 4 segmentli düz çubuk. Dolu segment rengi: seviye 0-1
`--accent`, 2 `--warn`, 3 `--ok`; boş segment `--rule`. Yanında düz metin
etiket, altında tek satır ipucu. Yuvarlak rozet, gradyan, cam efekti yok.
`aria-live="polite"`.

### `client/src/pages/Dashboard/ChangePasswordSection.tsx`

`SettingsPage.tsx` zaten 560 satır, bu yüzden ayrı dosya; SettingsPage sadece
`<Section title="ŞİFRE"><ChangePasswordSection /></Section>` çağırır. Mevcut
`Input` / `Button` / `toast` bileşenleri kullanılır.

Üç alan: mevcut şifre, yeni şifre, yeni şifre tekrar; göster/gizle düğmesi.
Ölçer yeni şifre alanının altında. Kaydet düğmesi şu durumlarda pasif: yeni
şifre 6 karakterden kısa, iki alan eşleşmiyor, istek uçuşta. Zayıf şifre
kaydetmeyi engellemez.

Başarıda: yanıttaki yeni `csrfToken` istemcinin token deposuna yazılır
(giriş akışındaki ile aynı yol), form temizlenir, toast,
`checkAuth()` ile kullanıcı yenilenir (band kaybolur). Hatalar ayrık:
401 yanlış mevcut şifre, 400 yeni şifre eskiyle aynı, 429 rate limit.

### `client/src/components/PasswordChangeBanner.tsx`

`EmailVerificationBanner.tsx` emsalinin aynısı. `useUser()` ile
`usingDistributedPassword` true ise görünür, `ModernDashboard.tsx:228`'de
e-posta bandının hemen altına eklenir.

Metin: "Hesabına verilen otomatik şifreyi kullanıyorsun. Ayarlardan kendi
şifreni belirleyebilirsin." + "Ayarlara Git" düğmesi.

Kapatma düğmesi `localStorage`'a kapatma tarihini yazar
(`tofas_pw_banner_dismissed_at`). Band, `passwordLastSetAt` bu tarihten
yeniyse (yani admin araya yeni bir reset attıysa) tekrar görünür.

## Test

**İstemci (vitest)**

- `passwordStrength.test.ts`: seviye sınırları (5 / 6 / 8 / 12 / 16 karakter),
  tekrar ve ardışık dizi cezaları, yaygın şifre eşleşmesi, kullanıcı adı içeren
  şifre cezası, boş girdi.
- `PasswordStrengthMeter`: doğru sayıda dolu segment, `aria-live` metni.

**Sunucu (vitest, `TEST_MONGODB_URI` ile)**

- doğru mevcut şifre + geçerli yeni şifre = 200; hash değişti,
  `passwordSelfChangedAt` doldu, `tokenVersion` arttı
- şifresi olmayan kullanıcı TCKN'sini mevcut şifre olarak verirse geçer
- yanlış mevcut şifre = 401, hiçbir alan değişmedi
- 5 karakterlik yeni şifre = 400
- yeni şifre = mevcut şifre = 400
- audit log'a `self_change` düştü ve kayıtta düz şifre yok
- e-posta gönderimi patlarsa istek yine 200

Mevcut `authService.test.ts` içindeki `validatePasswordStrength` beklentileri
(büyük harf / rakam) güncellenir.

**E2E:** yeni spec eklenmez; mevcut `password-mgmt` spec'i canlı Atlas'ı
kirletiyor. Yerine el ile doğrulama: giriş, bandı gör, şifreyi değiştir, band
kayboldu mu, yeni şifreyle giriş, eski şifre reddediliyor mu.

## Commit sırası

Tek PR, dört commit: (1) sunucu şema + endpoint + politika gevşetme,
(2) güç ölçer fonksiyonu + bileşeni, (3) ayarlar bölümü, (4) band.

PR açmadan önce: `npm run build`, `vite build`, iki tarafın testleri.

## Kapsam dışı

Şifre geçmişi / tekrar kullanım engeli, süre dolunca zorunlu değişim, 2FA ile
şifre değişimi doğrulaması.
