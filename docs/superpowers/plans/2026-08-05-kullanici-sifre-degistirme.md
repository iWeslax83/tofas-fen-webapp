# Kullanıcı şifre değiştirme + güç göstergesi: uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kullanıcı, kendisine dağıtılan rastgele şifreyi ayarlar sayfasından kendi seçtiği en az 6 karakterlik bir şifreyle değiştirebilsin; yazarken şifrenin gücünü görsün.

**Architecture:** Sunucuda mevcut `auth` modülüne `POST /api/auth/change-password` eklenir; şifre bcrypt ile yazılır, `passwordSelfChangedAt` damgalanır, `tokenVersion` artırılır ve giriş akışının çerez kalıbı tekrarlanarak işlemi yapan cihaz ayakta tutulur. İstemcide güç ölçümü bağımlılıksız saf bir fonksiyon, ölçer ayrı bir bileşen, form ayarlar sayfasına takılan ayrı bir bölüm, hatırlatma bandı ise mevcut e-posta bandının emsalini izleyen ayrı bir bileşen.

**Tech Stack:** Express + Mongoose + bcryptjs (server), React + React Query + Tailwind (client), vitest (iki tarafta).

Spec: `docs/superpowers/specs/2026-08-05-kullanici-sifre-degistirme-design.md`

## Global Constraints

- Şifre kuralı tek: 6-100 karakter. Büyük harf / küçük harf / rakam zorunluluğu **yok**. Güç göstergesi kaydetmeyi engellemez.
- Düz şifre hiçbir log'a, audit kaydına veya hata mesajına yazılmayacak.
- Commit mesajlarında ve kodda "Claude", AI atfı veya oturum bağlantısı geçmeyecek.
- Metinlerde uzun tire (—) yok; virgül, nokta veya parantez.
- Arayüzde gradyan, cam efekti, mor renk, yuvarlak durum rozeti yok. Renkler yalnızca mevcut token'lardan: `--accent` (#c8102e), `--ok`, `--warn`, `--rule`, `--ink`, `--ink-dim`.
- Sunucu testleri `TEST_MONGODB_URI` tanımlı değilse in-memory mongod ile çalışır, ek kurulum yok.
- İstemci değişikliğinden sonra `tsc --noEmit` yetmez, `vite build` de çalıştırılacak.

---

### Task 1: Sunucu, şifre değiştirme endpoint'i

**Files:**

- Modify: `server/src/models/User.ts` (arayüze ve şemaya `passwordSelfChangedAt`)
- Modify: `server/src/models/PasswordAuditLog.ts:3,6` (`self_change` action)
- Modify: `server/src/modules/auth/validators/authValidators.ts:58-75,95-110` (kural gevşetme)
- Modify: `server/src/modules/auth/services/authService.ts:657-690` (`validatePasswordStrength`), yeni `changePassword`
- Modify: `server/src/modules/auth/controllers/authController.ts` (yeni `changePassword` handler)
- Modify: `server/src/modules/auth/routes/authRoutes.ts` (yeni route)
- Test: `server/src/test/modules/auth/changePassword.test.ts` (yeni)

**Interfaces:**

- Consumes: yok, ilk görev.
- Produces:
  - `AuthService.changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ tokens: TokenPair }>`: yanlış mevcut şifrede `AppError.unauthorized`, yeni şifre eskiyle aynıysa `AppError.validation` fırlatır.
  - `POST /api/auth/change-password`, gövde `{ currentPassword: string, newPassword: string }`, başarı yanıtı `{ success: true, message: string, csrfToken: string }` ve yeni `accessToken`/`refreshToken` httpOnly çerezleri.
  - `User.passwordSelfChangedAt?: Date`.

- [ ] **Step 1: Şema alanını ekle**

`server/src/models/User.ts`, `IUser` arayüzünde `passwordLastSetAt?: Date;` satırının (satır 39) hemen altına:

```ts
  /** Kullanıcının kendi belirlediği şifrenin zamanı. Admin reset'i bunu güncellemez. */
  passwordSelfChangedAt?: Date;
```

Şemada `passwordLastSetAt` tanımının (satır 175) hemen altına:

```ts
    passwordSelfChangedAt: {
      type: Date,
    },
```

- [ ] **Step 2: Audit log'a yeni eylem türünü ekle**

`server/src/models/PasswordAuditLog.ts` satır 3'ü:

```ts
export type PasswordAuditAction = 'bulk_import' | 'admin_generated' | 'admin_reset' | 'self_change';
```

Satır 6'daki dizinin sonuna `'self_change'` ekle:

```ts
export const PASSWORD_AUDIT_ACTIONS: PasswordAuditAction[] = [
  'bulk_import',
  'admin_generated',
  'admin_reset',
  'self_change',
];
```

Aynı dosyada admin ile ilgili alanlar (`adminId`, `adminName` benzeri) `required: true` ise, `self_change` kayıtlarında admin olmadığı için bunları `required: false` yap. Alan adlarını dosyadan bire bir oku, tahmin etme.

- [ ] **Step 3: Başarısızlığı gösteren testi yaz**

Create `server/src/test/modules/auth/changePassword.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { User } from '../../../models/User';
import { PasswordAuditLog } from '../../../models/PasswordAuditLog';
import { AuthService, BCRYPT_COST } from '../../../modules/auth/services/authService';

const ID = 'degistiren_kullanici';
const ESKI = 'EskiSifre1';
const YENI = 'yenisifre';

async function createUser(overrides: Record<string, unknown> = {}) {
  await User.create({
    id: ID,
    adSoyad: 'Şifre Testi',
    rol: 'student',
    sifre: await bcrypt.hash(ESKI, BCRYPT_COST),
    passwordLastSetAt: new Date('2026-01-01'),
    isActive: true,
    tokenVersion: 4,
    childId: [],
    ...overrides,
  });
}

describe('AuthService.changePassword', () => {
  beforeEach(async () => {
    await Promise.all([User.deleteMany({ id: ID }), PasswordAuditLog.deleteMany({})]);
    await createUser();
  });

  it('doğru mevcut şifreyle yeni şifreyi yazar', async () => {
    await AuthService.changePassword(ID, ESKI, YENI);

    const user = await User.findOne({ id: ID }).select('+sifre');
    expect(await bcrypt.compare(YENI, user!.sifre!)).toBe(true);
  });

  it('passwordSelfChangedAt damgasını atar', async () => {
    const oncesi = Date.now();
    await AuthService.changePassword(ID, ESKI, YENI);

    const user = await User.findOne({ id: ID });
    expect(user!.passwordSelfChangedAt!.getTime()).toBeGreaterThanOrEqual(oncesi);
  });

  it('tokenVersion değerini artırır', async () => {
    await AuthService.changePassword(ID, ESKI, YENI);

    const user = await User.findOne({ id: ID });
    expect(user!.tokenVersion).toBe(5);
  });

  it('yanlış mevcut şifreyi reddeder ve hiçbir şeyi değiştirmez', async () => {
    await expect(AuthService.changePassword(ID, 'BambaskaSifre1', YENI)).rejects.toThrow();

    const user = await User.findOne({ id: ID }).select('+sifre');
    expect(await bcrypt.compare(ESKI, user!.sifre!)).toBe(true);
    expect(user!.tokenVersion).toBe(4);
    expect(user!.passwordSelfChangedAt).toBeUndefined();
  });

  it('yeni şifre mevcut şifreyle aynıysa reddeder', async () => {
    await expect(AuthService.changePassword(ID, ESKI, ESKI)).rejects.toThrow();
  });

  it('audit log kaydı düşer ve kayıtta düz şifre bulunmaz', async () => {
    await AuthService.changePassword(ID, ESKI, YENI);

    const kayitlar = await PasswordAuditLog.find({ action: 'self_change' }).lean();
    expect(kayitlar).toHaveLength(1);
    expect(JSON.stringify(kayitlar[0])).not.toContain(YENI);
    expect(JSON.stringify(kayitlar[0])).not.toContain(ESKI);
  });

  it('hiç şifresi olmayan kullanıcı TCKN ile değiştirebilir', async () => {
    await User.deleteMany({ id: ID });
    await createUser({ sifre: undefined, passwordLastSetAt: undefined, tckn: '12345678901' });

    await AuthService.changePassword(ID, '12345678901', YENI);

    const user = await User.findOne({ id: ID }).select('+sifre');
    expect(await bcrypt.compare(YENI, user!.sifre!)).toBe(true);
  });
});
```

TCKN testi için `User` modelinin TCKN'yi şifreli sakladığını unutma (`authService.ts:107` çözüp karşılaştırıyor). Model TCKN'yi `pre('save')` kancasıyla şifreliyorsa test böyle çalışır; şifrelemeyi elle yapması gerekiyorsa mevcut bir testten (`server/src/test/modules/auth/authService.test.ts`) kurulum kalıbını kopyala.

- [ ] **Step 4: Testi çalıştır, kırmızı olduğunu gör**

Run: `cd server && npx vitest run src/test/modules/auth/changePassword.test.ts`
Beklenen: FAIL, `AuthService.changePassword is not a function`.

- [ ] **Step 5: Şifre kuralını gevşet**

`server/src/modules/auth/services/authService.ts` içindeki `validatePasswordStrength` (satır 657) gövdesinden büyük harf, küçük harf ve rakam kontrollerini (satır ~675-685) sil. Geriye kalan:

```ts
  static validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!password || password.length === 0) {
      errors.push('Şifre gereklidir');
      return { isValid: false, errors };
    }

    if (password.length < 6) {
      errors.push('Şifre en az 6 karakter olmalıdır');
    }

    if (password.length > 100) {
      errors.push('Şifre en fazla 100 karakter olabilir');
    }

    return { isValid: errors.length === 0, errors };
  }
```

`server/src/modules/auth/validators/authValidators.ts` içinde hem `validateChangePassword` hem `validateResetPassword` için `newPassword` zincirinden şu iki satırı sil:

```ts
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Yeni şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir'),
```

Kalan zincir `.notEmpty()` + `.isLength({ min: 6, max: 100 })` olmalı, sondaki virgül/kapanış bozulmasın.

- [ ] **Step 6: Servise changePassword ekle**

`server/src/modules/auth/services/authService.ts` içine, sınıfın diğer statik metotlarının yanına:

```ts
  /**
   * Kullanıcının kendi şifresini değiştirmesi. Mevcut şifreyi doğrular,
   * yenisini bcrypt ile yazar ve tokenVersion'ı artırarak diğer cihazlardaki
   * oturumları geçersiz kılar. Çağıranın cihazı düşmesin diye yeni token
   * çifti döner.
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ tokens: ReturnType<typeof generateTokenPair> }> {
    const user = await User.findOne({ id: userId }).select('+sifre');
    if (!user) {
      throw AppError.unauthorized('Kullanıcı bulunamadı');
    }

    let authenticated = false;
    if (user.sifre) {
      authenticated = await bcrypt.compare(currentPassword, user.sifre);
    } else if (user.tckn) {
      const decryptedTckn = decrypt(user.tckn);
      authenticated = String(decryptedTckn).trim() === String(currentPassword).trim();
    }

    if (!authenticated) {
      throw AppError.unauthorized('Mevcut şifre yanlış');
    }

    if (currentPassword === newPassword) {
      throw AppError.validation('Yeni şifre mevcut şifreyle aynı olamaz');
    }

    const { isValid, errors } = AuthService.validatePasswordStrength(newPassword);
    if (!isValid) {
      throw AppError.validation(errors.join(', '));
    }

    user.sifre = await bcrypt.hash(newPassword, BCRYPT_COST);
    user.passwordSelfChangedAt = new Date();
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    await recordPasswordEvent({
      user: { id: user.id, adSoyad: user.adSoyad, rol: user.rol },
      action: 'self_change',
      reason: 'other',
    });

    if (user.email) {
      sendMail(
        user.email,
        'Şifreniz değiştirildi',
        `<p>Merhaba ${user.adSoyad},</p>
         <p>Hesabınızın şifresi az önce değiştirildi. Bu işlemi siz yapmadıysanız
         okul yönetimiyle iletişime geçin.</p>`,
      ).catch(() => {});
    }

    return {
      tokens: generateTokenPair(user.id, user.rol, user.email, user.tokenVersion),
    };
  }
```

`decrypt`, `recordPasswordEvent`, `sendMail` ve `generateTokenPair` bu dosyada zaten import edilmiş olmayabilir; olmayanları ekle. `recordPasswordEvent`'in imzası `server/src/modules/passwordAdmin/passwordAuditService.ts:36`'da, `admin` alanı zorunluysa Step 2'de opsiyonele çektiğin şemaya uygun olarak tip tanımını da opsiyonele çek.

- [ ] **Step 7: Testi çalıştır, servis testlerinin geçtiğini gör**

Run: `cd server && npx vitest run src/test/modules/auth/changePassword.test.ts`
Beklenen: yedi test de PASS. Kalanlar varsa hata mesajını oku, testi değil kodu düzelt.

- [ ] **Step 8: Controller ve route'u ekle**

`server/src/modules/auth/controllers/authController.ts` içine, `login` handler'ının çerez yazma kalıbını izleyen yeni bir handler:

```ts
  static async changePassword(req: Request, res: Response): Promise<void> {
    const userId = (req as unknown as { user?: { userId?: string } }).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Oturum bulunamadı' });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    const { tokens } = await AuthService.changePassword(userId, currentPassword, newPassword);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: cookieSecure(),
      sameSite: cookieSameSite(),
      maxAge: tokens.expiresIn * 1000,
      path: '/',
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: cookieSecure(),
      sameSite: cookieSameSite(),
      maxAge: tokens.refreshExpiresIn * 1000,
      path: '/',
    });

    const csrfToken = issueCsrfToken(res, tokens.refreshExpiresIn * 1000);

    res.json({ success: true, message: 'Şifreniz güncellendi', csrfToken });
  }
```

`server/src/modules/auth/routes/authRoutes.ts` içine, login route'unun yakınına:

```ts
router.post(
  '/change-password',
  authenticateJWT,
  authLimiter,
  validateChangePassword,
  asyncHandler(AuthController.changePassword),
);
```

`validateChangePassword` import'unu aynı dosyadaki mevcut validator import satırına ekle. Bu dosyada `asyncHandler` kullanılmıyorsa kullanma; diğer route'lar hataları nasıl yakalıyorsa aynısını yap.

- [ ] **Step 9: HTTP seviyesinde testi yaz ve çalıştır**

`server/src/routes/__tests__/auth.test.ts` zaten supertest + express ile kurulmuş bir app içeriyor (`app.use('/auth', authRoutes)`) ve `AuthService`'i tamamen mock'luyor. Önce o mock'a yeni metodu ekle (dosyanın başındaki `vi.mock('../../modules/auth/services/authService', ...)` bloğu):

```ts
vi.mock('../../modules/auth/services/authService', () => ({
  AuthService: {
    authenticateUser: vi.fn(),
    registerUser: vi.fn(),
    rotateRefreshToken: vi.fn(),
    changePassword: vi.fn(),
  },
}));
```

Ardından dosyanın sonuna:

```ts
describe('POST /auth/change-password', () => {
  beforeEach(() => {
    vi.mocked(AuthService.changePassword).mockReset();
  });

  it('5 karakterlik yeni şifreyi 400 ile reddeder', async () => {
    const res = await request(app)
      .post('/auth/change-password')
      .set('Cookie', ['accessToken=access-token'])
      .send({ currentPassword: 'EskiSifre1', newPassword: 'kisa1' });

    expect(res.status).toBe(400);
    expect(AuthService.changePassword).not.toHaveBeenCalled();
  });

  it('6 karakterlik, rakamsız ve büyük harfsiz şifreyi kabul eder', async () => {
    vi.mocked(AuthService.changePassword).mockResolvedValue({
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        refreshExpiresIn: 259200,
        tokenVersion: 1,
      },
    } as any);

    const res = await request(app)
      .post('/auth/change-password')
      .set('Cookie', ['accessToken=access-token'])
      .send({ currentPassword: 'EskiSifre1', newPassword: 'yenisifre' });

    expect(res.status).toBe(200);
    expect(res.body.csrfToken).toBeTruthy();
    expect(AuthService.changePassword).toHaveBeenCalledWith(
      expect.any(String),
      'EskiSifre1',
      'yenisifre',
    );
  });

  it('oturum çerezi olmadan 401 döner', async () => {
    const res = await request(app)
      .post('/auth/change-password')
      .send({ currentPassword: 'EskiSifre1', newPassword: 'yenisifre' });

    expect(res.status).toBe(401);
  });
});
```

Dosyadaki `jsonwebtoken` mock'u her token'ı `{ userId: 'testuser' }` olarak çözüyor, bu yüzden çerez göndermek kimlik doğrulamayı geçmeye yeter.

Run: `cd server && npx vitest run src/test/modules/auth/ src/routes/__tests__/auth.test.ts`
Beklenen: PASS.

- [ ] **Step 10: Tip kontrolü ve tüm sunucu testleri**

```bash
cd server && npx tsc --noEmit && npx vitest run
```

Beklenen: temiz ve PASS.

- [ ] **Step 11: Commit**

```bash
git add server/src/models/User.ts \
        server/src/models/PasswordAuditLog.ts \
        server/src/modules/auth/ \
        server/src/test/modules/auth/changePassword.test.ts
git commit -m "feat(auth): kullanıcı kendi şifresini değiştirebilsin

POST /api/auth/change-password eklendi. Mevcut şifre doğrulanır (şifresi
olmayan kullanıcılarda TCKN kabul edilir), yenisi bcrypt ile yazılır,
passwordSelfChangedAt damgalanır ve tokenVersion artırılarak diğer
cihazlardaki oturumlar geçersizleşir; işlemi yapan cihaza yeni çerezler
yazılır.

Şifre kuralı tek bir alt sınıra indirildi: 6-100 karakter. Büyük harf ve
rakam zorunluluğu hem bu uçtan hem reset-password akışından kaldırıldı."
```

---

### Task 2: İstemci, güç ölçme fonksiyonu ve göstergesi

**Files:**

- Create: `client/src/utils/passwordStrength.ts`
- Create: `client/src/utils/__tests__/passwordStrength.test.ts`
- Create: `client/src/components/ui/PasswordStrengthMeter.tsx`

**Interfaces:**

- Consumes: yok, Görev 1'den bağımsız çalışabilir.
- Produces:
  - `scorePassword(pw: string, userHints?: string[]): { level: 0 | 1 | 2 | 3; label: string; hint: string }`
  - `<PasswordStrengthMeter password={string} userHints={string[]} />`

- [ ] **Step 1: Testi yaz**

Create `client/src/utils/__tests__/passwordStrength.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { scorePassword } from '../passwordStrength';

describe('scorePassword', () => {
  it('boş şifreye en düşük seviyeyi verir', () => {
    expect(scorePassword('').level).toBe(0);
  });

  it('6 karakterlik basit şifreyi zayıf sayar', () => {
    expect(scorePassword('abcdef').level).toBeLessThanOrEqual(1);
  });

  it('tekrar eden karakterleri cezalandırır', () => {
    expect(scorePassword('aaaaaaaaaa').level).toBe(0);
  });

  it('ardışık rakam dizisini cezalandırır', () => {
    expect(scorePassword('123456').level).toBe(0);
  });

  it('klavye dizisini cezalandırır', () => {
    expect(scorePassword('qwerty').level).toBe(0);
  });

  it('yaygın Türkçe şifreyi cezalandırır', () => {
    expect(scorePassword('parola').level).toBe(0);
  });

  it('kullanıcı ipucunu içeren şifreyi cezalandırır', () => {
    expect(scorePassword('ahmet2020', ['ahmet']).level).toBeLessThanOrEqual(1);
  });

  it('uzun ve çeşitli şifreyi güçlü sayar', () => {
    expect(scorePassword('Kirmizi-Bisiklet-42').level).toBe(3);
  });

  it('orta uzunlukta karışık şifreyi orta sayar', () => {
    expect(scorePassword('Bisiklet7').level).toBe(2);
  });

  it('her seviye için boş olmayan etiket ve ipucu döner', () => {
    for (const pw of ['', 'abcdef', 'Bisiklet7', 'Kirmizi-Bisiklet-42']) {
      const sonuc = scorePassword(pw);
      expect(sonuc.label.length).toBeGreaterThan(0);
      expect(sonuc.hint.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Testi çalıştır, kırmızı olduğunu gör**

Run: `cd client && npx vitest run src/utils/__tests__/passwordStrength.test.ts`
Beklenen: FAIL, modül bulunamıyor.

- [ ] **Step 3: Fonksiyonu yaz**

Create `client/src/utils/passwordStrength.ts`:

```ts
export type StrengthLevel = 0 | 1 | 2 | 3;

export interface StrengthResult {
  level: StrengthLevel;
  label: string;
  hint: string;
}

const LABELS: Record<StrengthLevel, string> = {
  0: 'Çok zayıf',
  1: 'Zayıf',
  2: 'Orta',
  3: 'Güçlü',
};

/** Sık kullanılan, tahmin edilmesi kolay şifreler. */
const COMMON = [
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '111111',
  '000000',
  '123123',
  'password',
  'parola',
  'sifre',
  'şifre',
  'qwerty',
  'asdasd',
  'iloveyou',
  'admin',
  'ogrenci',
  'öğrenci',
  'okul',
  'tofas',
  'tofaş',
  'fenlisesi',
  'galatasaray',
  'fenerbahce',
  'fenerbahçe',
  'besiktas',
  'beşiktaş',
  'trabzonspor',
  'turkiye',
  'türkiye',
  'istanbul',
  'ankara',
  'bursa',
  'anadolu',
  'mustafa',
  'kemal',
  'ataturk',
  'atatürk',
];

const SEQUENCES = [
  '0123456789',
  'abcdefghijklmnopqrstuvwxyz',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
];

/** Şifre, verilen dizilerden 4 karakterlik bir parçayı düz veya ters içeriyor mu. */
function hasSequence(lower: string): boolean {
  for (const seq of SEQUENCES) {
    for (let i = 0; i + 4 <= seq.length; i++) {
      const parca = seq.slice(i, i + 4);
      const ters = parca.split('').reverse().join('');
      if (lower.includes(parca) || lower.includes(ters)) return true;
    }
  }
  return false;
}

/** Şifrenin tamamı tek bir karakterin tekrarı mı. */
function isRepeat(pw: string): boolean {
  return pw.length > 0 && new Set(pw).size === 1;
}

function charClasses(pw: string): number {
  let n = 0;
  if (/[a-zçğıöşü]/.test(pw)) n++;
  if (/[A-ZÇĞİÖŞÜ]/.test(pw)) n++;
  if (/[0-9]/.test(pw)) n++;
  if (/[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]/.test(pw)) n++;
  return n;
}

/**
 * Şifre gücünü 0-3 arasında puanlar. Uzunluk ve karakter çeşitliliği puan
 * kazandırır; tekrar, ardışık dizi, yaygın şifre ve kullanıcının kendi
 * bilgilerini içermek puanı sıfıra çeker.
 */
export function scorePassword(pw: string, userHints: string[] = []): StrengthResult {
  if (!pw) {
    return { level: 0, label: LABELS[0], hint: 'Şifre gir.' };
  }

  const lower = pw.toLowerCase();

  if (isRepeat(pw)) {
    return { level: 0, label: LABELS[0], hint: 'Aynı karakteri tekrarlama.' };
  }

  if (COMMON.some((c) => lower === c || (c.length >= 5 && lower.includes(c)))) {
    return {
      level: 0,
      label: LABELS[0],
      hint: 'Çok bilinen bir şifre, başkası kolayca tahmin eder.',
    };
  }

  if (hasSequence(lower)) {
    return { level: 0, label: LABELS[0], hint: 'Ardışık harf veya rakam dizisi kullanma.' };
  }

  const hintHit = userHints
    .filter((h) => h && h.length >= 3)
    .some((h) => lower.includes(h.toLowerCase()));

  let puan = 0;
  if (pw.length >= 6) puan++;
  if (pw.length >= 8) puan++;
  if (pw.length >= 12) puan++;
  if (pw.length >= 16) puan++;
  puan += charClasses(pw) - 1;

  if (hintHit) puan -= 3;

  const level = (puan <= 1 ? 0 : puan <= 3 ? 1 : puan <= 5 ? 2 : 3) as StrengthLevel;

  const hint = hintHit
    ? 'Adını veya kullanıcı numaranı şifrende kullanma.'
    : level === 3
      ? 'İyi şifre.'
      : pw.length < 12
        ? 'Birkaç karakter daha ekle, uzunluk en çok işe yarayan şey.'
        : 'Rakam veya noktalama ekleyerek çeşitliliği artır.';

  return { level, label: LABELS[level], hint };
}
```

- [ ] **Step 4: Testi çalıştır**

Run: `cd client && npx vitest run src/utils/__tests__/passwordStrength.test.ts`
Beklenen: PASS. Eşik testlerinden biri kırmızıysa (örneğin `Bisiklet7` "orta" yerine "güçlü" çıkarsa) puan eşiklerini ayarla, testi gevşetme.

- [ ] **Step 5: Ölçer bileşenini yaz**

Create `client/src/components/ui/PasswordStrengthMeter.tsx`:

```tsx
import { scorePassword, type StrengthLevel } from '../../utils/passwordStrength';

interface PasswordStrengthMeterProps {
  password: string;
  userHints?: string[];
}

const SEGMENT_COLOR: Record<StrengthLevel, string> = {
  0: 'var(--accent)',
  1: 'var(--accent)',
  2: 'var(--warn)',
  3: 'var(--ok)',
};

/**
 * Şifre alanının altındaki güç göstergesi. Tavsiye niteliğinde, hiçbir şeyi
 * engellemez. Dört segmentli düz çubuk, yanında düz metin etiket.
 */
export function PasswordStrengthMeter({ password, userHints = [] }: PasswordStrengthMeterProps) {
  const { level, label, hint } = scorePassword(password, userHints);
  const doluSegment = password ? level + 1 : 0;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="h-1 flex-1 rounded-[1px]"
              style={{ background: i < doluSegment ? SEGMENT_COLOR[level] : 'var(--rule)' }}
            />
          ))}
        </div>
        <span className="text-xs text-[var(--ink-dim)] w-16 text-right">
          {password ? label : ''}
        </span>
      </div>
      <p className="text-xs text-[var(--ink-dim)] mt-1" aria-live="polite">
        {password ? `Şifre gücü: ${label}. ${hint}` : ''}
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Tip kontrolü ve derleme**

```bash
cd client && npx tsc --noEmit && npx vite build
```

Beklenen: ikisi de temiz.

- [ ] **Step 7: Commit**

```bash
git add client/src/utils/passwordStrength.ts \
        client/src/utils/__tests__/passwordStrength.test.ts \
        client/src/components/ui/PasswordStrengthMeter.tsx
git commit -m "feat(client): şifre gücü ölçer

Bağımlılıksız saf fonksiyon: uzunluk ve karakter çeşitliliği puan
kazandırır, tekrar, ardışık dizi, yaygın şifreler ve kullanıcının kendi
bilgileri puanı düşürür. Gösterge dört segmentli düz çubuk, mevcut renk
token'larını kullanır ve kaydetmeyi engellemez."
```

---

### Task 3: Ayarlar sayfasında şifre değiştirme bölümü

**Files:**

- Create: `client/src/pages/Dashboard/ChangePasswordSection.tsx`
- Modify: `client/src/pages/Dashboard/SettingsPage.tsx` (yeni `Section` bloğu)
- Modify: `client/src/utils/apiEndpoints.ts:4-12` (`CHANGE_PASSWORD` sabiti)

**Interfaces:**

- Consumes: Görev 1'in `POST /api/auth/change-password` ucu, Görev 2'nin `PasswordStrengthMeter` bileşeni.
- Produces: `<ChangePasswordSection />`, dışa açık prop'u yok.

- [ ] **Step 1: Endpoint sabitini ekle**

`client/src/utils/apiEndpoints.ts`, `AUTH` nesnesine:

```ts
    CHANGE_PASSWORD: '/api/auth/change-password',
```

- [ ] **Step 2: Bölümü yaz**

Create `client/src/pages/Dashboard/ChangePasswordSection.tsx`:

```tsx
import { useState } from 'react';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '../../contexts/AuthContext';
import { SecureAPI } from '../../utils/api';
import { API_ENDPOINTS } from '../../utils/apiEndpoints';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordStrengthMeter } from '../../components/ui/PasswordStrengthMeter';
import { safeConsoleError } from '../../utils/safeLogger';

function hataMesaji(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const durum = error.response?.status;
    if (durum === 401) return 'Mevcut şifren yanlış.';
    if (durum === 429) return 'Çok fazla deneme yaptın, biraz bekle.';
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
  }
  return 'Şifre değiştirilemedi, tekrar dene.';
}

export default function ChangePasswordSection() {
  const { user, checkAuth } = useAuthContext();
  const [mevcut, setMevcut] = useState('');
  const [yeni, setYeni] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [goster, setGoster] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const kisaligiTamam = yeni.length >= 6;
  const eslesiyor = yeni.length > 0 && yeni === tekrar;
  const kaydedilebilir = mevcut.length > 0 && kisaligiTamam && eslesiyor && !kaydediliyor;

  const kaydet = async () => {
    if (!kaydedilebilir) return;
    setKaydediliyor(true);
    try {
      await SecureAPI.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        currentPassword: mevcut,
        newPassword: yeni,
      });
      setMevcut('');
      setYeni('');
      setTekrar('');
      toast.success('Şifren güncellendi.');
      await checkAuth();
    } catch (error) {
      safeConsoleError('change password failed', error);
      toast.error(hataMesaji(error));
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[var(--ink-dim)]">
        En az 6 karakter. Aşağıdaki gösterge sadece bilgi verir, seçimini engellemez.
      </p>

      <Input
        type={goster ? 'text' : 'password'}
        value={mevcut}
        onChange={(e) => setMevcut(e.target.value)}
        placeholder="Mevcut şifren"
        autoComplete="current-password"
      />

      <div>
        <Input
          type={goster ? 'text' : 'password'}
          value={yeni}
          onChange={(e) => setYeni(e.target.value)}
          placeholder="Yeni şifren"
          autoComplete="new-password"
        />
        <PasswordStrengthMeter
          password={yeni}
          userHints={[user?.id ?? '', user?.adSoyad ?? ''].filter(Boolean)}
        />
      </div>

      <Input
        type={goster ? 'text' : 'password'}
        value={tekrar}
        onChange={(e) => setTekrar(e.target.value)}
        placeholder="Yeni şifren (tekrar)"
        autoComplete="new-password"
      />

      {tekrar.length > 0 && !eslesiyor && (
        <p className="text-xs" style={{ color: 'var(--accent)' }}>
          İki şifre aynı değil.
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setGoster((v) => !v)}
          className="flex items-center gap-2 text-xs text-[var(--ink-dim)]"
        >
          {goster ? <EyeOff size={14} /> : <Eye size={14} />}
          {goster ? 'Şifreleri gizle' : 'Şifreleri göster'}
        </button>

        <Button onClick={kaydet} disabled={!kaydedilebilir}>
          {kaydediliyor ? 'Kaydediliyor...' : 'Şifreyi değiştir'}
        </Button>
      </div>
    </div>
  );
}
```

`Input` ve `Button` bileşenlerinin prop adları farklıysa (`onChange` yerine `onValueChange` gibi) `SettingsPage.tsx` içindeki mevcut kullanımlara bak ve ona uy.

- [ ] **Step 3: Ayarlar sayfasına tak**

`client/src/pages/Dashboard/SettingsPage.tsx` içine import ekle:

```tsx
import ChangePasswordSection from './ChangePasswordSection';
```

ve mevcut `Section` bloklarının arasına, e-posta bölümünün hemen ardına:

```tsx
<Section title="ŞİFRE">
  <ChangePasswordSection />
</Section>
```

- [ ] **Step 4: Tip kontrolü ve derleme**

```bash
cd client && npx tsc --noEmit && npx vite build
```

Beklenen: temiz. `vite build` kırmızıysa çoğunlukla import yolu hatasıdır, `tsc` bunu yakalamayabilir.

- [ ] **Step 5: El ile dene**

`cd client && npx vite dev` ile aç, bir kullanıcıyla giriş yap, ayarlara git:

- 5 karakterlik şifrede kaydet düğmesi pasif olmalı
- iki alan farklıyken pasif olmalı
- yanlış mevcut şifrede "Mevcut şifren yanlış." toast'ı çıkmalı
- doğru bilgilerle kaydedince form temizlenmeli ve oturum düşmemeli
- çıkış yapıp yeni şifreyle giriş yapılabilmeli, eski şifre reddedilmeli

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Dashboard/ChangePasswordSection.tsx \
        client/src/pages/Dashboard/SettingsPage.tsx \
        client/src/utils/apiEndpoints.ts
git commit -m "feat(client): ayarlarda şifre değiştirme bölümü

Mevcut şifre, yeni şifre ve tekrar alanları; yeni şifrenin altında güç
göstergesi. Kaydet düğmesi yalnızca 6 karakter kuralı ve eşleşme sağlandığında
etkin; zayıf şifre engellenmez. Yanlış mevcut şifre, hız sınırı ve genel hata
ayrı mesaj gösterir."
```

---

### Task 4: Dağıtılan şifre hatırlatma bandı

**Files:**

- Modify: `server/src/modules/auth/services/authService.ts` (`toAuthUserPayload` yardımcısı)
- Modify: `server/src/routes/User.ts:670-682` (`/me` yanıtına türetilen alan)
- Create: `client/src/components/PasswordChangeBanner.tsx`
- Create: `client/src/components/PasswordChangeBanner.css`
- Modify: `client/src/components/ModernDashboard.tsx:19,228`
- Modify: `client/src/@types/index.ts` veya `client/src/types/user.ts` (kullanıcı tipine yeni alan)

**Interfaces:**

- Consumes: Görev 1'in `passwordSelfChangedAt` alanı, Görev 3'ün ayarlar bölümü (band oraya yönlendirir).
- Produces: kullanıcı nesnesinde `usingDistributedPassword: boolean`; `<PasswordChangeBanner />`, prop'suz.

- [ ] **Step 1: Türetilen alanı sunucuda üret**

`server/src/modules/auth/services/authService.ts` içinde, sınıfın dışında:

```ts
/** Kullanıcı hâlâ admin'in dağıttığı şifreyi mi kullanıyor. */
export function usingDistributedPassword(user: {
  passwordSelfChangedAt?: Date;
  passwordLastSetAt?: Date;
}): boolean {
  if (!user.passwordSelfChangedAt) return true;
  if (!user.passwordLastSetAt) return false;
  return user.passwordSelfChangedAt < user.passwordLastSetAt;
}

/** Giriş ve profil yanıtlarında dönen kullanıcı alanları, tek yerde. */
export function toAuthUserPayload(user: IUser) {
  return {
    id: user.id,
    adSoyad: user.adSoyad,
    rol: user.rol,
    email: user.email,
    emailVerified: user.emailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    sinif: user.sinif,
    sube: user.sube,
    oda: user.oda,
    pansiyon: user.pansiyon,
    lastLogin: user.lastLogin,
    usingDistributedPassword: usingDistributedPassword(user),
  };
}
```

`IUser` bu dosyada import edilmemişse ekle. Ardından aynı dosyadaki beş yerdeki (`182, 246, 275, 424, 823`) elle yazılmış `user: { ... }` nesnelerini `user: toAuthUserPayload(user)` ile değiştir. Her birinde döndürülen alan listesinin yukarıdakiyle aynı olduğunu tek tek doğrula; fazladan alan döndüren bir yer varsa onu `toAuthUserPayload`'a ekle, sessizce düşürme.

- [ ] **Step 2: /me yanıtına ekle**

`server/src/routes/User.ts` içindeki `/me` handler'ı (satır 670) `getUserById` sonucunu doğrudan döndürüyor. Yanıtı şu hâle getir:

```ts
res.json({
  ...(user as unknown as Record<string, unknown>),
  usingDistributedPassword: usingDistributedPassword(user),
});
```

`user` bir mongoose dokümanıysa yayma işlemi beklendiği gibi çalışmaz; o durumda `user.toObject()` kullan. `usingDistributedPassword` import'unu authService'ten al.

- [ ] **Step 3: Sunucu tarafını test et**

`server/src/test/modules/auth/changePassword.test.ts` dosyasına ekle:

```ts
describe('usingDistributedPassword', () => {
  it('hiç kendi şifresini belirlememişse true', async () => {
    const { usingDistributedPassword } = await import('../../../modules/auth/services/authService');
    expect(usingDistributedPassword({ passwordLastSetAt: new Date('2026-01-01') })).toBe(true);
  });

  it('kendi şifresi admin damgasından yeniyse false', async () => {
    const { usingDistributedPassword } = await import('../../../modules/auth/services/authService');
    expect(
      usingDistributedPassword({
        passwordLastSetAt: new Date('2026-01-01'),
        passwordSelfChangedAt: new Date('2026-02-01'),
      }),
    ).toBe(false);
  });

  it('admin sonradan reset attıysa tekrar true', async () => {
    const { usingDistributedPassword } = await import('../../../modules/auth/services/authService');
    expect(
      usingDistributedPassword({
        passwordSelfChangedAt: new Date('2026-01-01'),
        passwordLastSetAt: new Date('2026-03-01'),
      }),
    ).toBe(true);
  });
});
```

Run: `cd server && npx vitest run src/test/modules/auth/changePassword.test.ts`
Beklenen: PASS.

- [ ] **Step 4: İstemci tipine alanı ekle**

Kullanıcı tipinin tanımlı olduğu dosyayı bul:

Run: `grep -rn "emailVerified" client/src/types/user.ts client/src/@types/index.ts`

Bulduğun arayüze ekle:

```ts
  usingDistributedPassword?: boolean;
```

- [ ] **Step 5: Bandı yaz**

Create `client/src/components/PasswordChangeBanner.css`:

```css
.password-change-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--rule);
  border-left: 3px solid var(--accent);
  background: var(--surface, transparent);
  margin-bottom: 1rem;
}

.password-change-banner .banner-text {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ink);
}

.password-change-banner .banner-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}
```

Create `client/src/components/PasswordChangeBanner.tsx`:

```tsx
import { useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../stores/authStore';
import './PasswordChangeBanner.css';

const DISMISS_KEY = 'tofas_pw_banner_dismissed_at';

const PasswordChangeBanner: React.FC = () => {
  const user = useUser();
  const navigate = useNavigate();
  const [kapatildi, setKapatildi] = useState(() => {
    const kapatmaZamani = localStorage.getItem(DISMISS_KEY);
    if (!kapatmaZamani) return false;
    // Admin araya yeni bir şifre yazdıysa bandı tekrar göster.
    const sonAdminYazimi = user?.passwordLastSetAt ? new Date(user.passwordLastSetAt) : null;
    if (sonAdminYazimi && sonAdminYazimi > new Date(kapatmaZamani)) return false;
    return true;
  });

  if (!user || user.usingDistributedPassword !== true || kapatildi) {
    return null;
  }

  const kapat = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setKapatildi(true);
  };

  return (
    <div className="password-change-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <KeyRound size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span className="banner-text">
          Hesabına verilen otomatik şifreyi kullanıyorsun. Ayarlardan kendi şifreni
          belirleyebilirsin.
        </span>
      </div>
      <div className="banner-actions">
        <button onClick={() => navigate(`/${user.rol || 'student'}/ayarlar`)}>Ayarlara Git</button>
        <button onClick={kapat} aria-label="Bildirimi kapat">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default PasswordChangeBanner;
```

Band `user.passwordLastSetAt` alanını okuyor; bu alan istemci kullanıcı nesnesinde yoksa Step 4'te eklediğin arayüze `passwordLastSetAt?: string;` de ekle ve `toAuthUserPayload`'a da ekle, aksi halde kapatma mantığı admin reset'ini fark edemez.

- [ ] **Step 6: Panele tak**

`client/src/components/ModernDashboard.tsx`, satır 19 civarındaki import bloğuna:

```tsx
import PasswordChangeBanner from './PasswordChangeBanner';
```

Satır 228'deki `<EmailVerificationBanner />` satırının hemen altına:

```tsx
<PasswordChangeBanner />
```

- [ ] **Step 7: Tip kontrolü, derleme, testler**

```bash
cd server && npx tsc --noEmit && npx vitest run
cd client && npx tsc --noEmit && npx vite build && npx vitest run
```

Beklenen: hepsi temiz ve PASS.

- [ ] **Step 8: El ile dene**

Hiç kendi şifresini belirlememiş bir kullanıcıyla giriş yap: band görünmeli. Ayarlardan şifreyi değiştir: band kaybolmalı (form `checkAuth()` çağırıyor). Bandı X ile kapat, sayfayı yenile: geri gelmemeli.

- [ ] **Step 9: Commit**

```bash
git add server/src/modules/auth/services/authService.ts \
        server/src/routes/User.ts \
        server/src/test/modules/auth/changePassword.test.ts \
        client/src/components/PasswordChangeBanner.tsx \
        client/src/components/PasswordChangeBanner.css \
        client/src/components/ModernDashboard.tsx
git add client/src/types/user.ts client/src/@types/index.ts 2>/dev/null || true
git commit -m "feat: dağıtılan şifreyi kullananlara hatırlatma bandı

Kullanıcı nesnesine usingDistributedPassword türetilen alanı eklendi
(passwordSelfChangedAt ile passwordLastSetAt karşılaştırması). Beş yerde
tekrarlanan giriş yanıtı alan listesi toAuthUserPayload altında birleşti.

Panelde e-posta bandının altında kapatılabilir bir hatırlatma çıkıyor;
admin yeni bir şifre yazarsa band tekrar görünür."
```

---

## Self-review notları

- Spec'in her bölümü bir göreve karşılık geliyor: sunucu ucu ve şema (Görev 1), güç ölçer (Görev 2), ayarlar formu (Görev 3), band ve türetilen alan (Görev 4).
- Spec'te "yanıt yeni token çifti döner" yazıyordu; token'lar httpOnly çerezde taşındığı için hem spec hem plan çerez yazımına güncellendi.
- `scorePassword`, `usingDistributedPassword`, `toAuthUserPayload`, `PasswordStrengthMeter`, `ChangePasswordSection`, `PasswordChangeBanner` isimleri bütün görevlerde aynı yazılıyor.
- Görev 3 Görev 1 ve 2'ye, Görev 4 Görev 1 ve 3'e dayanır; sıra korunmalı. Görev 2 tek başına da yapılabilir.
