# Giriş CAPTCHA'sı, sekme logosu, Son Hareketler: uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giriş yapmayı imkânsız kılan CAPTCHA'yı kaldırmak, sekmede görünmeyen logoyu düzeltmek, Son Hareketler akışındaki eski ve silinmiş kayıtları temizlemek.

**Architecture:** Üç bağımsız düzeltme, üç ayrı görev, üç ayrı PR. Görev 1 sunucuda ölü CAPTCHA katmanını siler ve mevcut hesap kilidine bırakır. Görev 2 istemcide ikon setini üretip `index.html` ve manifest'i gerçek dosyalara bağlar. Görev 3 hem sunucu sorgularına tarih/durum filtresi ekler hem de panelin React Query cache'ini her mount'ta tazeler.

**Tech Stack:** Express + Mongoose (server), React + Vite + React Query (client), vitest (iki tarafta da), ImageMagick (ikon üretimi).

Spec: `docs/superpowers/specs/2026-08-05-giris-captcha-favicon-son-hareketler-design.md`

## Global Constraints

- Commit mesajlarında ve kodda "Claude", AI atfı veya oturum bağlantısı geçmeyecek (proje kuralı).
- Metinlerde uzun tire (—) kullanılmayacak; virgül, nokta veya parantez.
- Arayüzde gradyan, cam efekti, mor renk, yuvarlak durum rozeti yok. Tek vurgu rengi `--accent: #c8102e`.
- Sunucu testleri `TEST_MONGODB_URI` tanımlı değilse in-memory mongod ile çalışır (`server/vitest.config.ts:19`), ek kurulum gerekmez.
- İstemci değişikliğinden sonra `tsc --noEmit` yetmez, `vite build` de çalıştırılacak.

---

### Task 1: Giriş CAPTCHA katmanını kaldır

**Files:**

- Modify: `server/src/modules/auth/routes/authRoutes.ts:8,52`
- Modify: `server/src/modules/auth/services/authService.ts:11,138-141,148-151`
- Modify: `server/src/routes/__tests__/auth.test.ts:12-15`
- Delete: `server/src/middleware/captcha.ts`
- Delete: `server/src/test/unit/captcha.test.ts`
- Test: `server/src/test/modules/auth/loginLockout.test.ts` (yeni)

**Interfaces:**

- Consumes: yok, ilk görev.
- Produces: yok. `trackFailedLogin`, `resetFailedLogin`, `captchaMiddleware`, `generateCaptcha`, `verifyCaptcha`, `isCaptchaRequired` isimleri projeden tamamen kalkar; başka hiçbir görev bunlara dayanmaz.

- [ ] **Step 1: CAPTCHA'nın gerçekten sadece bu üç dosyada kullanıldığını doğrula**

Run: `grep -rn "captcha" server/src client/src --include=*.ts --include=*.tsx -i`

Beklenen çıktı yalnızca şu dosyalar: `middleware/captcha.ts`, `modules/auth/routes/authRoutes.ts`, `modules/auth/services/authService.ts`, `routes/__tests__/auth.test.ts`, `test/unit/captcha.test.ts`. Başka bir dosya çıkarsa dur ve plana geri dön, o kullanımı da ele almak gerekir.

- [ ] **Step 2: Hesap kilidi davranışını sabitleyen testi yaz**

CAPTCHA kaldırıldığında geriye kalan tek koruma bu; testi önce yazıyoruz ki kaldırma sırasında yanlışlıkla bozarsak anlayalım.

Create `server/src/test/modules/auth/loginLockout.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { User } from '../../../models/User';
import { AuthService, BCRYPT_COST } from '../../../modules/auth/services/authService';

const ID = 'lockout_user';
const SIFRE = 'DogruSifre1';

async function createUser() {
  await User.create({
    id: ID,
    adSoyad: 'Kilit Testi',
    rol: 'student',
    sifre: await bcrypt.hash(SIFRE, BCRYPT_COST),
    isActive: true,
    tokenVersion: 0,
    failedLoginAttempts: 0,
    childId: [],
  });
}

describe('giriş kilidi', () => {
  beforeEach(async () => {
    await User.deleteMany({ id: ID });
    await createUser();
  });

  it('üçüncü hatalı denemeden sonra doğru şifreyle giriş yapılabilir', async () => {
    const meta = { ip: '10.0.0.1', userAgent: 'test' };

    for (let i = 0; i < 3; i++) {
      await expect(AuthService.login(ID, 'YanlisSifre1', meta)).rejects.toThrow();
    }

    const result = await AuthService.login(ID, SIFRE, meta);
    expect(result.user.id).toBe(ID);
  });

  it('beşinci hatalı denemede hesap kilitlenir', async () => {
    const meta = { ip: '10.0.0.2', userAgent: 'test' };

    for (let i = 0; i < 5; i++) {
      await expect(AuthService.login(ID, 'YanlisSifre1', meta)).rejects.toThrow();
    }

    const user = await User.findOne({ id: ID });
    expect(user?.failedLoginAttempts).toBeGreaterThanOrEqual(5);
    expect(user?.lockUntil?.getTime()).toBeGreaterThan(Date.now());
  });

  it('başarılı girişten sonra hatalı deneme sayacı sıfırlanır', async () => {
    const meta = { ip: '10.0.0.3', userAgent: 'test' };

    await expect(AuthService.login(ID, 'YanlisSifre1', meta)).rejects.toThrow();
    await AuthService.login(ID, SIFRE, meta);

    const user = await User.findOne({ id: ID });
    expect(user?.failedLoginAttempts).toBe(0);
  });
});
```

`AuthService.login`'in imzası `login(id, password, meta)` ve `meta` içinde `ip`/`userAgent` var (`authService.ts:54-60`). Testi yazdıktan sonra imzayı bir kez gözle doğrula, uyuşmuyorsa testi imzaya uydur, tersini yapma.

- [ ] **Step 3: Testi CAPTCHA hâlâ yerindeyken çalıştır**

Run: `cd server && npx vitest run src/test/modules/auth/loginLockout.test.ts`
Beklenen: PASS. Bu test CAPTCHA'dan bağımsız çalışır (servis katmanını çağırıyor, HTTP katmanını değil), yani kaldırmadan önce de geçmeli. Geçmiyorsa hata kaldırma işiyle ilgili değildir, önce onu çöz.

- [ ] **Step 4: Route'tan middleware'i çıkar**

`server/src/modules/auth/routes/authRoutes.ts`, satır 8'deki import satırını sil:

```ts
import { captchaMiddleware } from '../../../middleware/captcha';
```

Satır 52'yi şuna çevir:

```ts
router.post('/login', authLimiter, AuthController.login);
```

- [ ] **Step 5: Servisten takip çağrılarını çıkar**

`server/src/modules/auth/services/authService.ts`, satır 11'deki import'u sil:

```ts
import { trackFailedLogin, resetFailedLogin } from '../../../middleware/captcha';
```

Başarısız giriş bloğundaki şu parçayı (satır ~138):

```ts
// Track for CAPTCHA and security alerts
if (meta?.ip) {
  trackFailedLogin(meta.ip);
  SecurityAlertService.trackLoginFailure(id, meta.ip).catch(() => {});
}
```

şununla değiştir (güvenlik uyarısı takibi kalıyor, sadece CAPTCHA sayacı gidiyor):

```ts
if (meta?.ip) {
  SecurityAlertService.trackLoginFailure(id, meta.ip).catch(() => {});
}
```

Başarılı giriş yolundaki şu bloğu (satır ~148) tamamen sil:

```ts
// Reset CAPTCHA tracking on successful login
if (meta?.ip) {
  resetFailedLogin(meta.ip);
}
```

- [ ] **Step 6: Dosyaları sil ve test mock'unu temizle**

```bash
rm server/src/middleware/captcha.ts server/src/test/unit/captcha.test.ts
```

`server/src/routes/__tests__/auth.test.ts` içindeki şu bloğu sil (satır 12-15):

```ts
// Mock captcha middleware
vi.mock('../../middleware/captcha', () => ({
  captchaMiddleware: (req: any, res: any, next: any) => next(),
}));
```

Bu silme sonrası dosyada `vi` kullanılmıyorsa import'undan da çıkar, yoksa lint "unused" hatası verir.

- [ ] **Step 7: Artık hiç referans kalmadığını doğrula**

Run: `grep -rn "captcha" server/src client/src -i`
Beklenen: hiç sonuç yok.

- [ ] **Step 8: Tip kontrolü ve testler**

```bash
cd server && npx tsc --noEmit
cd server && npx vitest run src/test/modules/auth/ src/routes/__tests__/auth.test.ts
```

Beklenen: tsc temiz, testler PASS.

- [ ] **Step 9: Sunucu testlerinin tamamını çalıştır**

Run: `cd server && npx vitest run`
Beklenen: PASS. Kırmızı çıkan testler varsa hepsinin bu değişiklikten kaynaklanıp kaynaklanmadığını kontrol et; ilgisiz önceden kırık testleri düzeltmeye çalışma, sadece not düş.

- [ ] **Step 10: Commit**

```bash
git add server/src/modules/auth/routes/authRoutes.ts \
        server/src/modules/auth/services/authService.ts \
        server/src/routes/__tests__/auth.test.ts \
        server/src/test/modules/auth/loginLockout.test.ts
git add -u server/src/middleware/captcha.ts server/src/test/unit/captcha.test.ts
git commit -m "fix(auth): istemcide karşılığı olmayan CAPTCHA katmanını kaldır

Login route'u IP başına 3 hatalı denemeden sonra çözülemeyen bir CAPTCHA
istiyordu; istemcide bu ekranı gösteren hiçbir kod yoktu, kullanıcı
kilitleniyordu. Sayaç ayrıca IP başınaydı, okul tek NAT IP'sinin arkasında
olduğu için bir kişinin hatası herkesi etkiliyordu.

Yerine geçen korumalar zaten mevcut: authLimiter hız sınırı ve hesap başına
5 denemede devreye giren kilit."
```

---

### Task 2: Sekme logosu ve uygulama ikonları

**Files:**

- Create: `client/public/icons/favicon-32.png`
- Create: `client/public/icons/favicon-180.png`
- Create: `client/public/icons/icon-192.png`
- Create: `client/public/icons/icon-512.png`
- Create: `client/public/icons/icon-512-maskable.png`
- Modify: `client/index.html:5,8,13`
- Modify: `client/public/manifest.webmanifest`

**Interfaces:**

- Consumes: yok, Görev 1'den bağımsız.
- Produces: yok, başka görev bu dosyalara dayanmaz.

- [ ] **Step 1: Kaynak logonun durumunu doğrula**

```bash
file client/public/tofaslogo.png
ls client/public/vite.svg
```

Beklenen: logo `250 x 298` PNG (kare değil), `vite.svg` için "No such file or directory". İkincisi sekmede logo çıkmamasının sebebi.

- [ ] **Step 2: Kare, kenar boşluklu ikonları üret**

```bash
mkdir -p client/public/icons
cd client/public

# Kareye oturt: uzun kenarı baz al, şeffaf tuvale ortala.
magick tofaslogo.png -background none -gravity center -extent 298x298 /tmp/logo-square.png

magick /tmp/logo-square.png -resize 32x32   icons/favicon-32.png
magick /tmp/logo-square.png -resize 180x180 icons/favicon-180.png
magick /tmp/logo-square.png -resize 192x192 icons/icon-192.png
magick /tmp/logo-square.png -resize 512x512 icons/icon-512.png

# Maskable: Android logoyu daire/kare maskeyle kırpar, güvenli alan için
# logoyu %76'ya küçültüp 512'lik tuvale ortalıyoruz (yaklaşık %12 kenar boşluğu).
magick /tmp/logo-square.png -resize 390x390 -background none -gravity center \
       -extent 512x512 icons/icon-512-maskable.png
```

- [ ] **Step 3: Üretilen dosyaları doğrula**

Run: `file client/public/icons/*.png`
Beklenen: beş dosya, sırasıyla 32x32, 180x180, 192x192, 512x512, 512x512, hepsi RGBA.

- [ ] **Step 4: index.html'deki ölü referansı değiştir**

`client/index.html` satır 5'i sil:

```html
<link rel="icon" type="image/svg+xml" href="/vite.svg" />
```

Yerine (aynı yere):

```html
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
```

Satır 13'teki apple-touch-icon'u yeni dosyaya çevir:

```html
<link rel="apple-touch-icon" sizes="180x180" href="/icons/favicon-180.png" />
```

Satır 8'deki tema rengini vurgu rengine çek:

```html
<meta name="theme-color" content="#c8102e" />
```

- [ ] **Step 5: Manifest'i gerçek boyutlara bağla**

`client/public/manifest.webmanifest` içinde `theme_color` alanını `"#c8102e"` yap ve `icons` dizisini şununla değiştir:

```json
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
```

Aynı dosyadaki `shortcuts` girdilerinde `"src": "/tofaslogo.png", "sizes": "96x96"` yazan iki yeri `"src": "/icons/icon-192.png", "sizes": "192x192"` yap; 96x96 diye bir dosya yok, o iddia da yanlıştı.

- [ ] **Step 6: Manifest'in geçerli JSON olduğunu doğrula**

Run: `python3 -m json.tool client/public/manifest.webmanifest > /dev/null && echo "JSON gecerli"`
Beklenen: `JSON gecerli`.

- [ ] **Step 7: Derle ve ikonların çıktıya kopyalandığını doğrula**

```bash
cd client && npx vite build
ls dist/icons/
```

Beklenen: build başarılı, `dist/icons/` içinde beş png.

- [ ] **Step 8: Tarayıcıda gör**

```bash
cd client && npx vite preview
```

`http://localhost:4173` adresini sert yenilemeyle (Ctrl+Shift+R) aç; service worker eski `index.html`'i tutuyor olabilir, o yüzden sert yenileme şart. Sekmede Tofaş logosu görünmeli. Görmezsen DevTools > Application > Service Workers > Unregister deyip tekrar dene.

- [ ] **Step 9: Commit**

```bash
git add client/public/icons client/index.html client/public/manifest.webmanifest
git commit -m "fix(client): sekme logosunu ve uygulama ikonlarını onar

index.html silinmiş /vite.svg dosyasına işaret ediyordu, tarayıcı 404 alıp
varsayılan simgeyi gösteriyordu. Logo kare değildi ve manifest olmayan
boyutlar iddia ediyordu; kare, kenar boşluklu bir ikon seti üretildi,
maskable ikon ayrı girdiye alındı. Tema rengi siteyle aynı kırmızıya çekildi."
```

---

### Task 3: Son Hareketler'i tazele ve süz

**Files:**

- Modify: `server/src/modules/dashboard/dashboardService.ts:136-330`
- Modify: `client/src/hooks/queries/useDashboardOverview.ts:118`
- Test: `server/src/test/modules/dashboard/activityFeed.test.ts` (yeni)

**Interfaces:**

- Consumes: yok, Görev 1 ve 2'den bağımsız.
- Produces: `dashboardService.ts` içinde `ACTIVITY_WINDOW_MS` sabiti ve `activitySince()` yardımcısı; sadece bu dosyada kullanılır.

- [ ] **Step 1: Filtrelerin eksikliğini gösteren testi yaz**

Create `server/src/test/modules/dashboard/activityFeed.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Announcement, Homework, User } from '../../../models';
import { getTeacherOverview } from '../../../modules/dashboard/dashboardService';

const TEACHER = 'ogretmen_1';

const gunOnce = (n: number) => new Date(Date.now() - n * 86_400_000);

async function createTeacher() {
  await User.create({
    id: TEACHER,
    adSoyad: 'Test Öğretmen',
    rol: 'teacher',
    isActive: true,
    tokenVersion: 0,
    childId: [],
  });
}

describe('öğretmen Son Hareketler akışı', () => {
  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({ id: TEACHER }),
      Homework.deleteMany({ teacherId: TEACHER }),
      Announcement.deleteMany({}),
    ]);
    await createTeacher();
  });

  it('30 günden eski ödevi göstermez', async () => {
    await Homework.create({
      teacherId: TEACHER,
      title: 'Eski ödev',
      subject: 'Matematik',
      classLevel: '9',
      assignedDate: gunOnce(45),
      dueDate: gunOnce(40),
      status: 'active',
      isPublished: true,
    });

    const overview = await getTeacherOverview(TEACHER);
    expect(overview.recentActivity.map((e) => e.title)).not.toContain('Ödev verildi: Eski ödev');
  });

  it('süresi geçmiş ödevi göstermez', async () => {
    await Homework.create({
      teacherId: TEACHER,
      title: 'Süresi geçmiş ödev',
      subject: 'Fizik',
      classLevel: '10',
      assignedDate: gunOnce(3),
      dueDate: gunOnce(1),
      status: 'expired',
      isPublished: true,
    });

    const overview = await getTeacherOverview(TEACHER);
    expect(overview.recentActivity.map((e) => e.title)).not.toContain(
      'Ödev verildi: Süresi geçmiş ödev',
    );
  });

  it('yayınlanmamış ödevi göstermez', async () => {
    await Homework.create({
      teacherId: TEACHER,
      title: 'Taslak ödev',
      subject: 'Kimya',
      classLevel: '11',
      assignedDate: gunOnce(2),
      dueDate: gunOnce(-5),
      status: 'active',
      isPublished: false,
    });

    const overview = await getTeacherOverview(TEACHER);
    expect(overview.recentActivity.map((e) => e.title)).not.toContain('Ödev verildi: Taslak ödev');
  });

  it('güncel yayınlanmış ödevi gösterir', async () => {
    await Homework.create({
      teacherId: TEACHER,
      title: 'Güncel ödev',
      subject: 'Biyoloji',
      classLevel: '9',
      assignedDate: gunOnce(1),
      dueDate: gunOnce(-3),
      status: 'active',
      isPublished: true,
    });

    const overview = await getTeacherOverview(TEACHER);
    expect(overview.recentActivity.map((e) => e.title)).toContain('Ödev verildi: Güncel ödev');
  });

  it('30 günden eski duyuruyu göstermez', async () => {
    const eski = await Announcement.create({
      title: 'Eski duyuru',
      content: 'içerik',
      author: 'Admin',
      date: gunOnce(60).toISOString(),
      targetRoles: ['teacher'],
    });
    await Announcement.updateOne({ _id: eski._id }, { $set: { createdAt: gunOnce(60) } });

    const overview = await getTeacherOverview(TEACHER);
    expect(overview.recentActivity.map((e) => e.title)).not.toContain('Eski duyuru');
  });
});
```

`Homework` modelinin zorunlu alanları farklıysa (`server/src/models/Homework.ts`) testteki `create` çağrılarını modele uydur; testin iddiaları değişmez.

- [ ] **Step 2: Testi çalıştır, kırmızı olduğunu gör**

Run: `cd server && npx vitest run src/test/modules/dashboard/activityFeed.test.ts`
Beklenen: FAIL. En az üç test düşmeli (eski ödev, süresi geçmiş ödev, yayınlanmamış ödev, eski duyuru), çünkü şu an hiçbir filtre yok. "Güncel ödevi gösterir" testi baştan geçmeli.

- [ ] **Step 3: Pencere sabitini ve yardımcıyı ekle**

`server/src/modules/dashboard/dashboardService.ts`, `ACTIVITY_LIMIT` tanımının hemen altına (satır ~136):

```ts
/** Son Hareketler penceresi: bundan eskisi "son" sayılmaz. */
const ACTIVITY_WINDOW_MS = 30 * 86_400_000;

const activitySince = (): Date => new Date(Date.now() - ACTIVITY_WINDOW_MS);
```

- [ ] **Step 4: Duyuru sorgusuna pencere ekle**

`announcementActivity` içindeki sorguyu şu hâle getir:

```ts
const anns = await Announcement.find({
  createdAt: { $gte: activitySince() },
  $or: [{ targetRoles: role }, { targetRoles: { $size: 0 } }, { targetRoles: { $exists: false } }],
});
```

- [ ] **Step 5: Öğretmen akışını süz**

`getTeacherActivity` içindeki ödev ve dilekçe sorgularını şu hâle getir:

```ts
    Homework.find({
      teacherId: userId,
      isPublished: true,
      status: { $ne: 'expired' },
      assignedDate: { $gte: activitySince() },
    })
      .sort({ assignedDate: -1 })
      .limit(ACTIVITY_LIMIT)
      .lean<
        Array<{
          id?: string;
          title: string;
          subject: string;
          classLevel: string;
          assignedDate: Date;
        }>
      >(),
    Dilekce.find({ reviewedBy: userId, createdAt: { $gte: activitySince() } })
      .sort({ createdAt: -1 })
      .limit(ACTIVITY_LIMIT)
      .lean<Array<{ _id: unknown; subject: string; userName: string; createdAt: Date }>>(),
```

- [ ] **Step 6: Öğrenci akışını süz**

`getStudentActivity` içinde not ve ödev sorgularını şu hâle getir:

```ts
    Note.find({ studentId: userId, lastUpdated: { $gte: activitySince() } })
      .sort({ lastUpdated: -1 })
      .limit(ACTIVITY_LIMIT)
      .lean<Array<{ _id: unknown; lesson: string; average?: number; lastUpdated: Date }>>(),
    classLevel
      ? Homework.find({
          classLevel,
          isPublished: true,
          status: { $ne: 'expired' },
          academicYear: getAcademicYear(),
          assignedDate: { $gte: activitySince() },
        })
```

Sorgunun geri kalanı (`.sort`, `.limit`, `.lean`) değişmez.

- [ ] **Step 7: Yönetici ve veli akışlarını süz**

`getAdminActivity` içinde:

```ts
    Registration.find({ createdAt: { $gte: activitySince() } })
      .sort({ createdAt: -1 })
      .limit(ACTIVITY_LIMIT)
      .lean<Array<{ _id: unknown; studentName: string; status: string; createdAt: Date }>>(),
    Dilekce.find({ createdAt: { $gte: activitySince() } })
      .sort({ createdAt: -1 })
      .limit(ACTIVITY_LIMIT)
      .lean<Array<{ _id: unknown; subject: string; userName: string; createdAt: Date }>>(),
```

`getParentActivity` içinde:

```ts
      ? Note.find({ studentId: { $in: childIds }, lastUpdated: { $gte: activitySince() } })
```

Sorgunun geri kalanı değişmez.

- [ ] **Step 8: Testleri çalıştır, yeşile döndüğünü gör**

Run: `cd server && npx vitest run src/test/modules/dashboard/activityFeed.test.ts`
Beklenen: beş test de PASS.

- [ ] **Step 9: Panelin cache'ini her mount'ta tazele**

`client/src/hooks/queries/useDashboardOverview.ts`, satır 118'deki seçenek nesnesini değiştir:

```ts
    { staleTime: 0, refetchOnMount: 'always' },
```

`useApiQuery`'nin bu iki seçeneği geçirdiğini doğrula (`client/src/hooks/useReactQuery.ts:106-107` varsayılanları geçersiz kılabilmeli). Geçirmiyorsa `useApiQuery` imzasına bu seçenekleri ekle, `useDashboardOverview`'i başka bir hook'a taşıma.

- [ ] **Step 10: Tip kontrolü ve derleme**

```bash
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit && npx vite build
```

Beklenen: üçü de temiz.

- [ ] **Step 11: Sunucu testlerinin tamamı**

Run: `cd server && npx vitest run`
Beklenen: PASS.

- [ ] **Step 12: Commit**

```bash
git add server/src/modules/dashboard/dashboardService.ts \
        server/src/test/modules/dashboard/activityFeed.test.ts \
        client/src/hooks/queries/useDashboardOverview.ts
git commit -m "fix(dashboard): Son Hareketler'de eski ve geçersiz kayıtları göstermeyi bırak

Akış sorgularında tarih penceresi yoktu, aylar öncesi duyurular ve süresi
geçmiş ya da yayınlanmamış ödevler 'son hareket' olarak listeleniyordu.
Tüm akışlara 30 günlük pencere, ödevlere isPublished ve status filtresi
eklendi.

Panel sorgusu da 60 saniye boyunca bayat kalıyordu; staleTime sıfırlanıp
her mount'ta yeniden çekilmesi sağlandı, böylece silinen bir kayıt panele
dönüldüğünde görünmüyor."
```

- [ ] **Step 13: El ile doğrula ve sonucu raporla**

Uygulamayı çalıştır, bir duyuru sil, panele dön: kayıt kaybolmalı. Ardından sert yenileme yap. Hâlâ duran bir kayıt varsa bu düzeltmelerin dışında bir sebep var demektir; kaydın türünü ve rolünü not et, veritabanında ilgili koleksiyonda gerçekten durup durmadığına bakılacak.

---

## Self-review notları

- Spec'in üç bölümü de birer göreve karşılık geliyor: CAPTCHA (Görev 1), ikonlar (Görev 2), Son Hareketler (Görev 3).
- Spec'teki "mutasyonlara invalidateQueries ekle" maddesi, ilgili sayfaların React Query kullanmadığı tespit edildiği için spec'te de plandan da çıkarıldı; yerini `refetchOnMount: 'always'` aldı.
- `ACTIVITY_WINDOW_MS` ve `activitySince` isimleri Görev 3'ün bütün adımlarında aynı yazılıyor.
