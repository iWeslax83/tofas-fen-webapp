# Öğretim Yılı Geçişi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Her 1 Ağustos'ta öğrencileri bir sınıf üste taşıyan, 12. sınıfları mezun edip hesaplarını kapatan, admin onaylı ve geri alınabilir bir öğretim yılı geçişi.

**Architecture:** Cron `proposed` durumunda bir `AcademicYearRollover` kaydı üretir ve hiçbir kullanıcıya dokunmaz; admin panelden onaylayınca snapshot üzerinden `bulkWrite` uygulanır. Eski öğretim yılı içeriği ayrı bir arşivleme işlemiyle değil, kayıtların taşıdığı `academicYear` alanı ve tarihten türetilen "içinde bulunulan yıl" filtresiyle kendiliğinden listelerden düşer.

**Tech Stack:** TypeScript, Express 4, Mongoose, node-cron, Vitest, React 19 + TanStack Query.

## Global Constraints

- Öğretim yılı biçimi her yerde `YYYY-YYYY` (örn. `2026-2027`). `Schedule` route validator'ı bunu `/^\d{4}-\d{4}$/` ile zaten zorluyor.
- Öğretim yılı sınırı **1 Ağustos**, UTC üzerinden hesaplanır. Cron `0 3 1 8 *` + `timezone: 'Europe/Istanbul'` = 1 Ağustos 00:00 UTC; iki taraf aynı yılı görür.
- `Note` modeli ve notlarla ilgili hiçbir sorgu bu planda değiştirilmez.
- `User.sinif` enum'u (`'9'|'10'|'11'|'12'`) değişmez; mezunda `'12'` kalır.
- Sunucu test coverage eşiği %80. Testler `cd server && npx vitest run <dosya>` ile çalıştırılır; `setup.ts` in-memory MongoDB açar ve her testten önce koleksiyonları temizler.
- Commit mesajlarında yapay zekâ atfı, "Claude" adı veya `Co-Authored-By` satırı bulunmaz.
- Yeni admin rotaları `authenticateJWT` + `authorizeRoles(['admin'])` arkasında olur.

## File Structure

**Yeni:**

- `server/src/utils/academicYear.ts` — öğretim yılı hesabı, tek doğruluk kaynağı
- `server/src/models/AcademicYearRollover.ts` — geçiş kaydı + snapshot
- `server/src/migrations/004-backfill-homework-academic-year.ts`
- `server/src/modules/academicYear/academicYearService.ts` — propose/apply/rollback/cancel
- `server/src/modules/academicYear/academicYearController.ts`
- `server/src/modules/academicYear/academicYearValidators.ts`
- `server/src/modules/academicYear/academicYearRoutes.ts`
- `client/src/pages/Dashboard/OgretimYiliPage.tsx`

**Değişen:**

- `server/src/models/Homework.ts` — `academicYear` alanı
- `server/src/models/User.ts` — `mezuniyetTarihi` alanı
- `server/src/models/index.ts` — yeni model export'ları
- `server/src/routes/Homework.ts:124` — okuma filtresi varsayılanı
- `server/src/routes/Schedule.ts:136` — okuma filtresi varsayılanı
- `server/src/modules/dashboard/dashboardService.ts:341,365` — okuma filtresi varsayılanı
- `server/src/services/SchedulerService.ts` — üçüncü cron işi
- `server/src/config/routes.ts` — rota kaydı
- `shared/types/user.ts` — `mezuniyetTarihi`
- `client/src/utils/apiEndpoints.ts` — `ACADEMIC_YEAR_ENDPOINTS`
- `client/src/routes/AppRoutes.tsx` — `/admin/ogretim-yili`

---

### Task 1: `getAcademicYear` util

Tarihten öğretim yılını türeten saf fonksiyon. Sistemde başka hiçbir yerde "içinde bulunulan öğretim yılı" hesaplanmaz.

**Files:**

- Create: `server/src/utils/academicYear.ts`
- Test: `server/src/test/unit/academicYear.test.ts`

**Interfaces:**

- Consumes: yok
- Produces: `getAcademicYear(date?: Date): string` — `"2026-2027"` biçiminde. `getPreviousAcademicYear(academicYear: string): string` — `"2026-2027"` → `"2025-2026"`.

- [ ] **Step 1: Write the failing test**

`server/src/test/unit/academicYear.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getAcademicYear, getPreviousAcademicYear } from '../../utils/academicYear';

describe('getAcademicYear', () => {
  it('31 Temmuz hâlâ önceki öğretim yılıdır', () => {
    expect(getAcademicYear(new Date('2026-07-31T20:00:00Z'))).toBe('2025-2026');
  });

  it('1 Ağustos yeni öğretim yılını başlatır', () => {
    expect(getAcademicYear(new Date('2026-08-01T00:00:00Z'))).toBe('2026-2027');
  });

  it('Aralık ayı, başladığı takvim yılının öğretim yılındadır', () => {
    expect(getAcademicYear(new Date('2026-12-15T00:00:00Z'))).toBe('2026-2027');
  });

  it('Ocak ayı, bir önceki takvim yılında başlayan öğretim yılındadır', () => {
    expect(getAcademicYear(new Date('2027-01-15T00:00:00Z'))).toBe('2026-2027');
  });

  it('UTC üzerinden hesaplar, yerel saat diliminden etkilenmez', () => {
    // 1 Ağustos 02:00 Istanbul = 31 Temmuz 23:00 UTC -> hâlâ eski yıl
    expect(getAcademicYear(new Date('2026-07-31T23:00:00Z'))).toBe('2025-2026');
  });
});

describe('getPreviousAcademicYear', () => {
  it('bir önceki öğretim yılını döndürür', () => {
    expect(getPreviousAcademicYear('2026-2027')).toBe('2025-2026');
  });

  it('geçersiz biçimde hata fırlatır', () => {
    expect(() => getPreviousAcademicYear('2026')).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/test/unit/academicYear.test.ts`
Expected: FAIL — `Failed to resolve import "../../utils/academicYear"`

- [ ] **Step 3: Write the implementation**

`server/src/utils/academicYear.ts`:

```ts
/**
 * Öğretim yılı hesabı — sistemdeki tek doğruluk kaynağı.
 *
 * Yıl sınırı 1 Ağustos'tur ve UTC üzerinden hesaplanır. SchedulerService'in
 * geçiş cron'u `0 3 1 8 *` + Europe/Istanbul ile çalışır; bu 1 Ağustos 00:00
 * UTC'ye denk gelir, dolayısıyla cron tetiklendiğinde bu fonksiyon da yeni
 * yılı döndürür. Yerel saat dilimi kullanmak sunucunun TZ ayarına göre
 * değişen sonuç üretirdi.
 */

const ACADEMIC_YEAR_RE = /^(\d{4})-(\d{4})$/;

/** Örn. 2026-08-01 -> "2026-2027", 2026-07-31 -> "2025-2026" */
export function getAcademicYear(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const isSecondHalf = date.getUTCMonth() >= 7; // 7 = Ağustos
  const startYear = isSecondHalf ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

/** "2026-2027" -> "2025-2026" */
export function getPreviousAcademicYear(academicYear: string): string {
  const match = ACADEMIC_YEAR_RE.exec(academicYear);
  if (!match) {
    throw new Error(`Geçersiz öğretim yılı biçimi: ${academicYear}`);
  }
  const startYear = Number(match[1]) - 1;
  return `${startYear}-${startYear + 1}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/test/unit/academicYear.test.ts`
Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git add server/src/utils/academicYear.ts server/src/test/unit/academicYear.test.ts
git commit -m "feat(server): add academic year helper with 1 August boundary"
```

---

### Task 2: `Homework.academicYear` alanı ve backfill migration

`Schedule` ve `Note` zaten `academicYear` taşıyor; eksik olan tek model `Homework`.

**Files:**

- Modify: `server/src/models/Homework.ts`
- Create: `server/src/migrations/004-backfill-homework-academic-year.ts`
- Test: `server/src/test/models/homeworkAcademicYear.test.ts`

**Interfaces:**

- Consumes: `getAcademicYear` (Task 1)
- Produces: `IHomework.academicYear: string`

- [ ] **Step 1: Write the failing test**

`server/src/test/models/homeworkAcademicYear.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Homework } from '../../models';
import { getAcademicYear } from '../../utils/academicYear';
import migration from '../../migrations/004-backfill-homework-academic-year';

function homeworkFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: `hw_${Math.random().toString(36).slice(2)}`,
    title: 'Test ödevi',
    description: 'Açıklama',
    subject: 'Matematik',
    teacherId: 'teacher_1',
    teacherName: 'Test Öğretmen',
    classLevel: '10',
    classSection: 'A',
    dueDate: new Date('2026-09-15'),
    ...overrides,
  };
}

describe('Homework.academicYear', () => {
  it('yeni kayıtta içinde bulunulan öğretim yılıyla doldurulur', async () => {
    const hw = await Homework.create(homeworkFixture());
    expect(hw.academicYear).toBe(getAcademicYear());
  });

  it('açıkça verilen değeri ezmez', async () => {
    const hw = await Homework.create(homeworkFixture({ academicYear: '2024-2025' }));
    expect(hw.academicYear).toBe('2024-2025');
  });
});

describe('migration 004-backfill-homework-academic-year', () => {
  it('alanı olmayan kayıtları içinde bulunulan yılla damgalar', async () => {
    await Homework.collection.insertOne(homeworkFixture({ id: 'hw_eski' }));

    await migration.up();

    const doc = await Homework.collection.findOne({ id: 'hw_eski' });
    expect(doc?.academicYear).toBe(getAcademicYear());
  });

  it('zaten damgalı kayıtlara dokunmaz', async () => {
    await Homework.collection.insertOne(
      homeworkFixture({ id: 'hw_damgali', academicYear: '2019-2020' }),
    );

    await migration.up();

    const doc = await Homework.collection.findOne({ id: 'hw_damgali' });
    expect(doc?.academicYear).toBe('2019-2020');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/test/models/homeworkAcademicYear.test.ts`
Expected: FAIL — migration modülü çözülemez, `hw.academicYear` `undefined`

- [ ] **Step 3: Add the model field**

`server/src/models/Homework.ts` — importlara ekle:

```ts
import { getAcademicYear } from '../utils/academicYear';
```

`IHomework` arayüzünde `classSection?: string;` satırının hemen altına:

```ts
academicYear: string; // Öğretim yılı (2026-2027) — arşivleme sınırı
```

Şemada `classSection: String,` satırının hemen altına:

```ts
  academicYear: {
    type: String,
    required: true,
    default: () => getAcademicYear(),
    index: true,
  },
```

- [ ] **Step 4: Write the migration**

`server/src/migrations/004-backfill-homework-academic-year.ts`:

```ts
/**
 * Migration: Homework kayıtlarına academicYear damgası
 *
 * `academicYear` alanı Homework modeline sonradan eklendi. Mevcut kayıtlarda
 * alan yok; okuma filtreleri içinde bulunulan yıla göre süzdüğü için
 * damgalanmayan kayıtlar hiçbir listede görünmezdi. Bu migration onları
 * çalıştığı andaki öğretim yılıyla damgalar.
 *
 * Schedule ve Note kapsam dışı — her ikisi de alanı zaten taşıyor.
 */

import { Homework } from '../models/Homework';
import { getAcademicYear } from '../utils/academicYear';
import logger from '../utils/logger';

export interface Migration {
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

const migration: Migration = {
  name: '004-backfill-homework-academic-year',

  async up() {
    const academicYear = getAcademicYear();
    logger.info(`Running migration: 004-backfill-homework-academic-year (up) -> ${academicYear}`);

    // Şema artık alanı required yaptığı için Mongoose katmanı yerine
    // doğrudan koleksiyon kullanılır.
    const result = await Homework.collection.updateMany(
      { academicYear: { $exists: false } },
      { $set: { academicYear } },
    );
    logger.info(`✅ Backfilled ${result.modifiedCount} homework record(s)`);
  },

  async down() {
    logger.info('Running migration: 004-backfill-homework-academic-year (down)');
    const result = await Homework.collection.updateMany({}, { $unset: { academicYear: '' } });
    logger.info(`✅ Removed academicYear from ${result.modifiedCount} homework record(s)`);
  },
};

export default migration;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx vitest run src/test/models/homeworkAcademicYear.test.ts`
Expected: PASS — 4 tests

- [ ] **Step 6: Commit**

```bash
git add server/src/models/Homework.ts server/src/migrations/004-backfill-homework-academic-year.ts server/src/test/models/homeworkAcademicYear.test.ts
git commit -m "feat(server): add academicYear to Homework with backfill migration"
```

---

### Task 3: Homework okuma filtrelerini içinde bulunulan yıla varsayılanla

Alan eklemek tek başına arşivleme yapmaz — sorguların süzmesi gerekir.

**Files:**

- Modify: `server/src/routes/Homework.ts:114-124`
- Modify: `server/src/modules/dashboard/dashboardService.ts:341`
- Test: `server/src/test/routes/homeworkAcademicYearFilter.test.ts`

**Interfaces:**

- Consumes: `getAcademicYear` (Task 1), `IHomework.academicYear` (Task 2)
- Produces: `GET /api/homework` artık opsiyonel `academicYear` query parametresi kabul eder

- [ ] **Step 1: Write the failing test**

`server/src/test/routes/homeworkAcademicYearFilter.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { Homework, User } from '../../models';
import { getAcademicYear, getPreviousAcademicYear } from '../../utils/academicYear';
import { generateAccessToken } from '../../utils/jwt';

const CURRENT = getAcademicYear();
const PREVIOUS = getPreviousAcademicYear(CURRENT);

function homeworkFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: `hw_${Math.random().toString(36).slice(2)}`,
    title: 'Ödev',
    description: 'Açıklama',
    subject: 'Matematik',
    teacherId: 'teacher_1',
    teacherName: 'Test Öğretmen',
    classLevel: '10',
    classSection: 'A',
    dueDate: new Date('2026-09-15'),
    ...overrides,
  };
}

describe('GET /api/homework — öğretim yılı filtresi', () => {
  let token: string;

  beforeEach(async () => {
    await User.create({
      id: 'admin_1',
      adSoyad: 'Test Admin',
      rol: 'admin',
      isActive: true,
      childId: [],
    });
    token = generateAccessToken({ userId: 'admin_1', role: 'admin' });

    await Homework.create(homeworkFixture({ id: 'hw_bu_yil', academicYear: CURRENT }));
    await Homework.create(homeworkFixture({ id: 'hw_gecen_yil', academicYear: PREVIOUS }));
  });

  it('parametresiz istekte sadece içinde bulunulan yılın ödevleri döner', async () => {
    const res = await request(app)
      .get('/api/homework')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const ids = res.body.homeworks.map((h: { id: string }) => h.id);
    expect(ids).toContain('hw_bu_yil');
    expect(ids).not.toContain('hw_gecen_yil');
  });

  it('academicYear parametresiyle arşiv okunabilir', async () => {
    const res = await request(app)
      .get(`/api/homework?academicYear=${PREVIOUS}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const ids = res.body.homeworks.map((h: { id: string }) => h.id);
    expect(ids).toContain('hw_gecen_yil');
    expect(ids).not.toContain('hw_bu_yil');
  });
});
```

> **Not:** `app` ve `generateAccessToken` import yolları bu repodaki mevcut route testleriyle aynıdır. Farklıysa `server/src/test/routes/` altındaki bir mevcut testten birebir kopyala; test kurulumunu yeniden icat etme.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/test/routes/homeworkAcademicYearFilter.test.ts`
Expected: FAIL — ilk test `hw_gecen_yil`'i de döndürür, `not.toContain` başarısız

- [ ] **Step 3: Patch the route filter**

`server/src/routes/Homework.ts` — importlara ekle:

```ts
import { getAcademicYear } from '../utils/academicYear';
```

`router.get('/', ...)` içinde query destructuring'e `academicYear` ekle ve filtreyi kur:

```ts
const {
  subject,
  classLevel,
  classSection,
  teacherId,
  status,
  academicYear,
  page = 1,
  limit = 20,
} = req.query;

const filter: MongoFilter<IHomework> = {
  // Öğretim yılı geçişinde eski yılın ödevleri kendiliğinden listeden
  // düşer. Arşive bakmak için ?academicYear=2025-2026 verilir.
  academicYear: (academicYear as string) || getAcademicYear(),
};
```

- [ ] **Step 4: Patch the dashboard filter**

`server/src/modules/dashboard/dashboardService.ts` — importlara ekle:

```ts
import { getAcademicYear } from '../../utils/academicYear';
```

341. satırı değiştir:

```ts
// academicYear tüm Homework sorgularına yayılır (357, 358, 363, 379).
const classFilter = classLevel
  ? { classLevel, academicYear: getAcademicYear() }
  : { academicYear: getAcademicYear() };
```

`getStudentActivity` içindeki 180. satırdaki sorguyu da güncelle:

```ts
    classLevel
      ? Homework.find({ classLevel, isPublished: true, academicYear: getAcademicYear() })
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx vitest run src/test/routes/homeworkAcademicYearFilter.test.ts`
Expected: PASS — 2 tests

- [ ] **Step 6: Run the full homework and dashboard suites for regressions**

Run: `cd server && npx vitest run src/test/routes src/test/modules`
Expected: PASS. Kırılan test varsa sebebi neredeyse kesin olarak fixture'ın `academicYear` taşımamasıdır — fixture'a alanı ekle, filtreyi gevşetme.

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/Homework.ts server/src/modules/dashboard/dashboardService.ts server/src/test/routes/homeworkAcademicYearFilter.test.ts
git commit -m "feat(server): scope homework reads to the current academic year"
```

---

### Task 4: Schedule okuma filtrelerini içinde bulunulan yıla varsayılanla

`Schedule.academicYear` zaten var ve `required`. Eksik olan tek şey: parametre verilmediğinde tüm yılların dönmesi.

**Files:**

- Modify: `server/src/routes/Schedule.ts:136`, `server/src/routes/Schedule.ts:222`
- Modify: `server/src/modules/dashboard/dashboardService.ts:365`
- Test: `server/src/test/routes/scheduleAcademicYearFilter.test.ts`

**Interfaces:**

- Consumes: `getAcademicYear` (Task 1)
- Produces: yok

- [ ] **Step 1: Write the failing test**

`server/src/test/routes/scheduleAcademicYearFilter.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { Schedule, User } from '../../models';
import { getAcademicYear, getPreviousAcademicYear } from '../../utils/academicYear';
import { generateAccessToken } from '../../utils/jwt';

const CURRENT = getAcademicYear();
const PREVIOUS = getPreviousAcademicYear(CURRENT);

function scheduleFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: `sch_${Math.random().toString(36).slice(2)}`,
    classLevel: '10',
    classSection: 'A',
    semester: '1. Dönem',
    isActive: true,
    schedule: [
      {
        day: 'Pazartesi',
        periods: [
          {
            period: 1,
            subject: 'Matematik',
            teacherId: 'teacher_1',
            teacherName: 'Test Öğretmen',
            startTime: '09:00',
            endTime: '09:40',
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('GET /api/schedule — öğretim yılı filtresi', () => {
  let token: string;

  beforeEach(async () => {
    await User.create({
      id: 'admin_1',
      adSoyad: 'Test Admin',
      rol: 'admin',
      isActive: true,
      childId: [],
    });
    token = generateAccessToken({ userId: 'admin_1', role: 'admin' });

    await Schedule.create(scheduleFixture({ id: 'sch_bu_yil', academicYear: CURRENT }));
    await Schedule.create(scheduleFixture({ id: 'sch_gecen_yil', academicYear: PREVIOUS }));
  });

  it('parametresiz istekte sadece içinde bulunulan yılın programı döner', async () => {
    const res = await request(app)
      .get('/api/schedule')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const ids = res.body.schedules.map((s: { id: string }) => s.id);
    expect(ids).toContain('sch_bu_yil');
    expect(ids).not.toContain('sch_gecen_yil');
  });

  it('academicYear parametresiyle arşiv okunabilir', async () => {
    const res = await request(app)
      .get(`/api/schedule?academicYear=${PREVIOUS}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const ids = res.body.schedules.map((s: { id: string }) => s.id);
    expect(ids).toContain('sch_gecen_yil');
    expect(ids).not.toContain('sch_bu_yil');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/test/routes/scheduleAcademicYearFilter.test.ts`
Expected: FAIL — ilk test iki kaydı da döndürür

- [ ] **Step 3: Patch the route filters**

`server/src/routes/Schedule.ts` — importlara ekle:

```ts
import { getAcademicYear } from '../utils/academicYear';
```

136. satır (liste endpoint'i):

```ts
// Parametre verilmezse içinde bulunulan öğretim yılı; arşiv için
// ?academicYear=2025-2026 verilir.
filter.academicYear = (academicYear as string) || getAcademicYear();
```

222. satır (`/class/:classLevel/:classSection` endpoint'i) — aynı biçimde:

```ts
filter.academicYear = (academicYear as string) || getAcademicYear();
```

- [ ] **Step 4: Patch the dashboard schedule lookup**

`server/src/modules/dashboard/dashboardService.ts` 365. satır:

```ts
    classLevel && classSection
      ? Schedule.findOne({
          classLevel,
          classSection,
          isActive: true,
          academicYear: getAcademicYear(),
        }).lean<{
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx vitest run src/test/routes/scheduleAcademicYearFilter.test.ts`
Expected: PASS — 2 tests

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/Schedule.ts server/src/modules/dashboard/dashboardService.ts server/src/test/routes/scheduleAcademicYearFilter.test.ts
git commit -m "feat(server): default schedule reads to the current academic year"
```

---

### Task 5: `User.mezuniyetTarihi`

Mezuniyeti `isActive: false`'tan ayırt eden alan — idari olarak kilitlenmiş hesaplar da pasiftir.

**Files:**

- Modify: `server/src/models/User.ts:44` (arayüz), `server/src/models/User.ts` (şema)
- Modify: `shared/types/user.ts:13` civarı
- Test: `server/src/test/models/userMezuniyet.test.ts`

**Interfaces:**

- Consumes: yok
- Produces: `IUser.mezuniyetTarihi?: Date`

- [ ] **Step 1: Write the failing test**

`server/src/test/models/userMezuniyet.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { User } from '../../models';

describe('User.mezuniyetTarihi', () => {
  it('varsayılan olarak tanımsızdır', async () => {
    const user = await User.create({
      id: 'ogr_1',
      adSoyad: 'Test Öğrenci',
      rol: 'student',
      sinif: '12',
      sube: 'A',
      childId: [],
    });
    expect(user.mezuniyetTarihi).toBeUndefined();
  });

  it('set edilebilir ve okunabilir', async () => {
    const mezuniyet = new Date('2026-08-01T00:00:00Z');
    await User.create({
      id: 'ogr_2',
      adSoyad: 'Mezun Öğrenci',
      rol: 'student',
      sinif: '12',
      sube: 'A',
      isActive: false,
      mezuniyetTarihi: mezuniyet,
      childId: [],
    });

    const found = await User.findOne({ id: 'ogr_2' });
    expect(found?.mezuniyetTarihi?.toISOString()).toBe(mezuniyet.toISOString());
  });

  it('mezunun sinif alanı 12 olarak kalır', async () => {
    const found = await User.findOne({ id: 'ogr_2' });
    expect(found?.sinif).toBe('12');
  });
});
```

> Üçüncü test `beforeEach` koleksiyonları temizlediği için ikinci testin kaydını bulamaz. Üçüncü testi kendi `User.create` çağrısıyla kur — kayıt oluşturmayı ikinci testten kopyala, `id: 'ogr_3'` kullan.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/test/models/userMezuniyet.test.ts`
Expected: FAIL — TypeScript `mezuniyetTarihi` alanını tanımıyor

- [ ] **Step 3: Add the field**

`server/src/models/User.ts` — `IUser` arayüzünde `isActive: boolean;` satırının hemen üstüne:

```ts
  /** 12. sınıfı bitirip öğretim yılı geçişinde mezun edilen öğrencilerde dolu. */
  mezuniyetTarihi?: Date;
```

Şemada `isActive` tanımının hemen üstüne:

```ts
    mezuniyetTarihi: {
      type: Date,
      index: true, // Mezun listeleri ve raporlar için
    },
```

`shared/types/user.ts` — `sinif?: string;` satırının altına:

```ts
  mezuniyetTarihi?: string;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/test/models/userMezuniyet.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add server/src/models/User.ts shared/types/user.ts server/src/test/models/userMezuniyet.test.ts
git commit -m "feat(server): add mezuniyetTarihi to the user model"
```

---

### Task 6: `AcademicYearRollover` modeli

Geçişin durumunu ve geri alma için gereken snapshot'ı tutar.

**Files:**

- Create: `server/src/models/AcademicYearRollover.ts`
- Modify: `server/src/models/index.ts`
- Test: `server/src/test/models/academicYearRollover.test.ts`

**Interfaces:**

- Consumes: yok
- Produces: `AcademicYearRollover` modeli, `IAcademicYearRollover`, `RolloverStatus`, `RolloverSnapshotEntry`, `ROLLOVER_STATUSES`

- [ ] **Step 1: Write the failing test**

`server/src/test/models/academicYearRollover.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { AcademicYearRollover } from '../../models';

function rolloverFixture(overrides: Record<string, unknown> = {}) {
  return {
    rolloverId: '11111111-1111-4111-8111-111111111111',
    fromYear: '2025-2026',
    toYear: '2026-2027',
    snapshot: [
      { userId: 'ogr_1', adSoyad: 'A B', fromSinif: '9', action: 'promote' },
      { userId: 'ogr_2', adSoyad: 'C D', fromSinif: '12', action: 'graduate' },
    ],
    ...overrides,
  };
}

describe('AcademicYearRollover', () => {
  it('varsayılan durumu proposed', async () => {
    const doc = await AcademicYearRollover.create(rolloverFixture());
    expect(doc.status).toBe('proposed');
    expect(doc.proposedAt).toBeInstanceOf(Date);
  });

  it('snapshot girdilerini korur', async () => {
    const doc = await AcademicYearRollover.create(rolloverFixture());
    expect(doc.snapshot).toHaveLength(2);
    expect(doc.snapshot[1].action).toBe('graduate');
  });

  it('aynı toYear için ikinci kayıt reddedilir', async () => {
    await AcademicYearRollover.create(rolloverFixture());
    await expect(
      AcademicYearRollover.create(
        rolloverFixture({ rolloverId: '22222222-2222-4222-8222-222222222222' }),
      ),
    ).rejects.toThrow();
  });

  it('geçersiz status reddedilir', async () => {
    await expect(
      AcademicYearRollover.create(rolloverFixture({ status: 'yanlis' })),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/test/models/academicYearRollover.test.ts`
Expected: FAIL — `AcademicYearRollover` export edilmiyor

- [ ] **Step 3: Write the model**

`server/src/models/AcademicYearRollover.ts`:

```ts
import mongoose, { Schema, Document } from 'mongoose';

export type RolloverStatus = 'proposed' | 'applied' | 'rolled_back' | 'cancelled';

export const ROLLOVER_STATUSES: RolloverStatus[] = [
  'proposed',
  'applied',
  'rolled_back',
  'cancelled',
];

export interface RolloverSnapshotEntry {
  userId: string;
  adSoyad: string;
  /** Terfi öncesi sınıf — geri alma bu değere döner. */
  fromSinif: string;
  action: 'promote' | 'graduate';
}

export interface IAcademicYearRollover extends Document {
  rolloverId: string;
  fromYear: string;
  toYear: string;
  status: RolloverStatus;
  snapshot: RolloverSnapshotEntry[];
  proposedAt: Date;
  appliedAt?: Date;
  appliedBy?: string;
  rolledBackAt?: Date;
  rolledBackBy?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
}

const SnapshotEntrySchema = new Schema<RolloverSnapshotEntry>(
  {
    userId: { type: String, required: true },
    adSoyad: { type: String, required: true },
    fromSinif: { type: String, required: true, enum: ['9', '10', '11', '12'] },
    action: { type: String, required: true, enum: ['promote', 'graduate'] },
  },
  { _id: false },
);

const AcademicYearRolloverSchema = new Schema<IAcademicYearRollover>({
  rolloverId: { type: String, required: true, unique: true, index: true },
  fromYear: { type: String, required: true },
  // Unique: cron'un yeniden çalışması, deploy sonrası restart veya adminin
  // elle tetiklemesi aynı yıl için ikinci bir geçiş üretemez.
  toYear: { type: String, required: true, unique: true, index: true },
  status: {
    type: String,
    enum: ROLLOVER_STATUSES,
    required: true,
    default: 'proposed',
    index: true,
  },
  snapshot: { type: [SnapshotEntrySchema], default: [] },
  proposedAt: { type: Date, required: true, default: () => new Date() },
  appliedAt: Date,
  appliedBy: String,
  rolledBackAt: Date,
  rolledBackBy: String,
  cancelledAt: Date,
  cancelledBy: String,
});

export const AcademicYearRollover =
  mongoose.models.AcademicYearRollover ||
  mongoose.model<IAcademicYearRollover>('AcademicYearRollover', AcademicYearRolloverSchema);
```

`server/src/models/index.ts` sonuna:

```ts
export { AcademicYearRollover, ROLLOVER_STATUSES } from './AcademicYearRollover';
export type {
  IAcademicYearRollover,
  RolloverStatus,
  RolloverSnapshotEntry,
} from './AcademicYearRollover';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/test/models/academicYearRollover.test.ts`
Expected: PASS — 4 tests

> `toYear` unique testi in-memory MongoDB'de indeks kurulumunu bekler. Test kırmızı kalırsa üçüncü testin başına `await AcademicYearRollover.syncIndexes();` ekle.

- [ ] **Step 5: Commit**

```bash
git add server/src/models/AcademicYearRollover.ts server/src/models/index.ts server/src/test/models/academicYearRollover.test.ts
git commit -m "feat(server): add AcademicYearRollover model"
```

---

### Task 7: `proposeRollover` servisi

Cron'un çağıracağı öneri üretici. **Hiçbir `User` kaydına dokunmaz.**

**Files:**

- Create: `server/src/modules/academicYear/academicYearService.ts`
- Test: `server/src/test/modules/academicYear/proposeRollover.test.ts`

**Interfaces:**

- Consumes: `getAcademicYear`, `getPreviousAcademicYear` (Task 1), `AcademicYearRollover` (Task 6), `User`
- Produces:

  ```ts
  export interface RolloverAdminContext {
    id: string;
    adSoyad: string;
  }
  export async function proposeRollover(): Promise<IAcademicYearRollover | null>;
  export async function getPendingRollover(): Promise<IAcademicYearRollover | null>;
  export function summarizeSnapshot(snapshot: RolloverSnapshotEntry[]): Record<string, number>;
  ```

- [ ] **Step 1: Write the failing test**

`server/src/test/modules/academicYear/proposeRollover.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AcademicYearRollover, User } from '../../../models';
import {
  proposeRollover,
  getPendingRollover,
  summarizeSnapshot,
} from '../../../modules/academicYear/academicYearService';
import { getAcademicYear, getPreviousAcademicYear } from '../../../utils/academicYear';

async function createStudent(id: string, sinif: string, isActive = true) {
  await User.create({
    id,
    adSoyad: `Öğrenci ${id}`,
    rol: 'student',
    sinif,
    sube: 'A',
    isActive,
    childId: [],
  });
}

describe('proposeRollover', () => {
  beforeEach(async () => {
    await createStudent('s9', '9');
    await createStudent('s10', '10');
    await createStudent('s11', '11');
    await createStudent('s12', '12');
    await createStudent('s_pasif', '10', false);
    await User.create({
      id: 'ogretmen_1',
      adSoyad: 'Öğretmen',
      rol: 'teacher',
      isActive: true,
      childId: [],
    });
  });

  it('aktif öğrencileri snapshot alır, öğretmen ve pasifleri dışlar', async () => {
    const rollover = await proposeRollover();

    expect(rollover).not.toBeNull();
    expect(rollover!.snapshot).toHaveLength(4);
    const ids = rollover!.snapshot.map((e) => e.userId).sort();
    expect(ids).toEqual(['s10', 's11', 's12', 's9']);
  });

  it('12. sınıfı graduate, diğerlerini promote işaretler', async () => {
    const rollover = await proposeRollover();
    const byId = Object.fromEntries(rollover!.snapshot.map((e) => [e.userId, e.action]));

    expect(byId.s9).toBe('promote');
    expect(byId.s11).toBe('promote');
    expect(byId.s12).toBe('graduate');
  });

  it('hiçbir kullanıcı kaydını değiştirmez', async () => {
    await proposeRollover();

    const s12 = await User.findOne({ id: 's12' });
    expect(s12?.sinif).toBe('12');
    expect(s12?.isActive).toBe(true);
    expect(s12?.mezuniyetTarihi).toBeUndefined();
  });

  it('doğru fromYear/toYear atar', async () => {
    const rollover = await proposeRollover();
    expect(rollover!.toYear).toBe(getAcademicYear());
    expect(rollover!.fromYear).toBe(getPreviousAcademicYear(getAcademicYear()));
  });

  it('ikinci çağrıda yeni kayıt üretmez', async () => {
    await proposeRollover();
    const second = await proposeRollover();

    expect(second).toBeNull();
    expect(await AcademicYearRollover.countDocuments()).toBe(1);
  });

  it('aktif öğrenci yoksa kayıt oluşturmaz', async () => {
    await User.deleteMany({ rol: 'student' });
    const rollover = await proposeRollover();

    expect(rollover).toBeNull();
    expect(await AcademicYearRollover.countDocuments()).toBe(0);
  });
});

describe('getPendingRollover', () => {
  it('proposed kayıt yoksa null döner', async () => {
    expect(await getPendingRollover()).toBeNull();
  });
});

describe('summarizeSnapshot', () => {
  it('geçiş sayaçlarını üretir', () => {
    const counts = summarizeSnapshot([
      { userId: 'a', adSoyad: 'A', fromSinif: '9', action: 'promote' },
      { userId: 'b', adSoyad: 'B', fromSinif: '9', action: 'promote' },
      { userId: 'c', adSoyad: 'C', fromSinif: '11', action: 'promote' },
      { userId: 'd', adSoyad: 'D', fromSinif: '12', action: 'graduate' },
    ]);

    expect(counts).toEqual({ '9->10': 2, '11->12': 1, graduate: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/test/modules/academicYear/proposeRollover.test.ts`
Expected: FAIL — servis modülü çözülemez

- [ ] **Step 3: Write the service**

`server/src/modules/academicYear/academicYearService.ts`:

```ts
import { randomUUID } from 'crypto';
import {
  AcademicYearRollover,
  IAcademicYearRollover,
  RolloverSnapshotEntry,
  User,
} from '../../models';
import { getAcademicYear, getPreviousAcademicYear } from '../../utils/academicYear';
import logger from '../../utils/logger';

export interface RolloverAdminContext {
  id: string;
  adSoyad: string;
}

const PROMOTABLE_SINIFLAR = ['9', '10', '11', '12'];

/**
 * Geçiş önerisi üretir. Hiçbir kullanıcı kaydına dokunmaz — sadece o anki
 * durumun fotoğrafını `proposed` bir kayda yazar.
 *
 * `toYear` üzerindeki unique indeks sayesinde cron'un yeniden çalışması,
 * restart veya adminin elle tetiklemesi ikinci bir kayıt üretemez.
 */
export async function proposeRollover(): Promise<IAcademicYearRollover | null> {
  const toYear = getAcademicYear();
  const fromYear = getPreviousAcademicYear(toYear);

  const existing = await AcademicYearRollover.findOne({ toYear });
  if (existing) {
    logger.info(`Rollover for ${toYear} already exists (${existing.status}), skipping proposal`);
    return null;
  }

  const students = (await User.find({
    rol: 'student',
    isActive: true,
    sinif: { $in: PROMOTABLE_SINIFLAR },
  })
    .select('id adSoyad sinif')
    .lean()) as unknown as { id: string; adSoyad: string; sinif: string }[];

  if (students.length === 0) {
    logger.info('No active students found, no rollover proposed');
    return null;
  }

  const snapshot: RolloverSnapshotEntry[] = students.map((s) => ({
    userId: s.id,
    adSoyad: s.adSoyad,
    fromSinif: s.sinif,
    action: s.sinif === '12' ? 'graduate' : 'promote',
  }));

  const rollover = await AcademicYearRollover.create({
    rolloverId: randomUUID(),
    fromYear,
    toYear,
    status: 'proposed',
    snapshot,
  });

  logger.info(
    `Proposed rollover ${fromYear} -> ${toYear}: ${snapshot.length} student(s) in snapshot`,
  );
  return rollover as IAcademicYearRollover;
}

export async function getPendingRollover(): Promise<IAcademicYearRollover | null> {
  return AcademicYearRollover.findOne({ status: 'proposed' }).sort({
    proposedAt: -1,
  }) as unknown as Promise<IAcademicYearRollover | null>;
}

/** Önizleme sayaçları — saklanmaz, snapshot'tan hesaplanır. */
export function summarizeSnapshot(snapshot: RolloverSnapshotEntry[]): Record<string, number> {
  return snapshot.reduce<Record<string, number>>((acc, entry) => {
    const key =
      entry.action === 'graduate'
        ? 'graduate'
        : `${entry.fromSinif}->${Number(entry.fromSinif) + 1}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/test/modules/academicYear/proposeRollover.test.ts`
Expected: PASS — 9 tests

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/academicYear/academicYearService.ts server/src/test/modules/academicYear/proposeRollover.test.ts
git commit -m "feat(server): propose academic year rollover from active students"
```

---

### Task 8: `applyRollover` servisi

Onaylanan geçişi uygular. Sıra hatasına yer bırakmamak için `updateMany` zinciri değil, snapshot bazlı `bulkWrite` kullanılır.

**Files:**

- Modify: `server/src/modules/academicYear/academicYearService.ts`
- Test: `server/src/test/modules/academicYear/applyRollover.test.ts`

**Interfaces:**

- Consumes: Task 7'nin tamamı
- Produces:

  ```ts
  export interface ApplyResult {
    promoted: number;
    graduated: number;
    failures: { userId: string; error: string }[];
  }
  export async function applyRollover(input: {
    rolloverId: string;
    admin: RolloverAdminContext;
  }): Promise<ApplyResult>;
  ```

  Hata kodları: `ROLLOVER_NOT_PENDING` (409).

- [ ] **Step 1: Write the failing test**

`server/src/test/modules/academicYear/applyRollover.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AcademicYearRollover, User } from '../../../models';
import { proposeRollover, applyRollover } from '../../../modules/academicYear/academicYearService';

const admin = { id: 'admin_1', adSoyad: 'Test Admin' };

async function createStudent(id: string, sinif: string, sube = 'B') {
  await User.create({
    id,
    adSoyad: `Öğrenci ${id}`,
    rol: 'student',
    sinif,
    sube,
    isActive: true,
    tokenVersion: 3,
    childId: [],
  });
}

describe('applyRollover', () => {
  let rolloverId: string;

  beforeEach(async () => {
    await createStudent('s9', '9');
    await createStudent('s11', '11');
    await createStudent('s12', '12');
    const rollover = await proposeRollover();
    rolloverId = rollover!.rolloverId;
  });

  it('her öğrenciyi bir sınıf üste taşır', async () => {
    await applyRollover({ rolloverId, admin });

    expect((await User.findOne({ id: 's9' }))?.sinif).toBe('10');
    expect((await User.findOne({ id: 's11' }))?.sinif).toBe('12');
  });

  it('şubeyi değiştirmez', async () => {
    await applyRollover({ rolloverId, admin });
    expect((await User.findOne({ id: 's9' }))?.sube).toBe('B');
  });

  it('12. sınıfı mezun eder ve oturumlarını düşürür', async () => {
    await applyRollover({ rolloverId, admin });

    const mezun = await User.findOne({ id: 's12' });
    expect(mezun?.isActive).toBe(false);
    expect(mezun?.mezuniyetTarihi).toBeInstanceOf(Date);
    expect(mezun?.tokenVersion).toBe(4);
    expect(mezun?.sinif).toBe('12');
  });

  it('terfi edenlerin tokenVersion değerine dokunmaz', async () => {
    await applyRollover({ rolloverId, admin });
    expect((await User.findOne({ id: 's9' }))?.tokenVersion).toBe(3);
  });

  it('sayaçları döndürür', async () => {
    const result = await applyRollover({ rolloverId, admin });
    expect(result.promoted).toBe(2);
    expect(result.graduated).toBe(1);
    expect(result.failures).toEqual([]);
  });

  it('kaydı applied durumuna geçirir ve admini damgalar', async () => {
    await applyRollover({ rolloverId, admin });

    const doc = await AcademicYearRollover.findOne({ rolloverId });
    expect(doc?.status).toBe('applied');
    expect(doc?.appliedBy).toBe('admin_1');
    expect(doc?.appliedAt).toBeInstanceOf(Date);
  });

  it('ikinci uygulama reddedilir ve veri iki kez terfi etmez', async () => {
    await applyRollover({ rolloverId, admin });

    await expect(applyRollover({ rolloverId, admin })).rejects.toMatchObject({
      code: 'ROLLOVER_NOT_PENDING',
    });
    expect((await User.findOne({ id: 's9' }))?.sinif).toBe('10');
  });

  it('snapshot içindeki silinmiş öğrenciyi failures olarak raporlar', async () => {
    await User.deleteOne({ id: 's11' });

    const result = await applyRollover({ rolloverId, admin });
    expect(result.failures.map((f) => f.userId)).toContain('s11');
    expect((await User.findOne({ id: 's9' }))?.sinif).toBe('10');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/test/modules/academicYear/applyRollover.test.ts`
Expected: FAIL — `applyRollover` export edilmiyor

- [ ] **Step 3: Write the implementation**

`server/src/modules/academicYear/academicYearService.ts` sonuna ekle:

```ts
export interface ApplyResult {
  promoted: number;
  graduated: number;
  failures: { userId: string; error: string }[];
}

// Mongoose'un kendi bulkWrite tipi kullanılır; elle yazılmış bir arayüz
// `User.bulkWrite(ops)` çağrısında atama hatası verir.
type UserBulkOp = mongoose.AnyBulkWriteOperation;

function buildApplyOps(snapshot: RolloverSnapshotEntry[], now: Date): UserBulkOp[] {
  return snapshot.map((entry) =>
    entry.action === 'graduate'
      ? {
          updateOne: {
            filter: { id: entry.userId },
            // tokenVersion artışı mezunun açık JWT'lerini anında geçersiz kılar.
            update: {
              $set: { isActive: false, mezuniyetTarihi: now },
              $inc: { tokenVersion: 1 },
            },
          },
        }
      : {
          updateOne: {
            filter: { id: entry.userId },
            update: { $set: { sinif: String(Number(entry.fromSinif) + 1) } },
          },
        },
  );
}

/**
 * Kullanıcı bazlı bulkWrite ile uygular. Zincirleme updateMany
 * (9->10, sonra 10->11) aynı öğrenciyi iki kez terfi ettirirdi; snapshot
 * yaklaşımında bu hata yapısal olarak imkânsız.
 */
export async function applyRollover(input: {
  rolloverId: string;
  admin: RolloverAdminContext;
}): Promise<ApplyResult> {
  const now = new Date();

  // Atomik compare-and-swap: iki eşzamanlı istekten yalnızca biri geçer.
  const rollover = (await AcademicYearRollover.findOneAndUpdate(
    { rolloverId: input.rolloverId, status: 'proposed' },
    { $set: { status: 'applied', appliedAt: now, appliedBy: input.admin.id } },
    { new: true },
  )) as IAcademicYearRollover | null;

  if (!rollover) {
    const err: NodeJS.ErrnoException = new Error(
      `Geçiş bulunamadı veya zaten işlenmiş: ${input.rolloverId}`,
    );
    err.code = 'ROLLOVER_NOT_PENDING';
    throw err;
  }

  const { applied, failures } = await runUserOps(
    rollover.snapshot,
    buildApplyOps(rollover.snapshot, now),
  );

  const failedIds = new Set(failures.map((f) => f.userId));
  const succeeded = rollover.snapshot.filter((e) => !failedIds.has(e.userId));

  logger.info(
    `Applied rollover ${rollover.fromYear} -> ${rollover.toYear}: ${applied} user(s) updated, ${failures.length} failure(s)`,
  );

  return {
    promoted: succeeded.filter((e) => e.action === 'promote').length,
    graduated: succeeded.filter((e) => e.action === 'graduate').length,
    failures,
  };
}

/**
 * bulkWrite'ı replica set varsa transaction içinde çalıştırır. Standalone
 * MongoDB'de transaction desteklenmediği için (kod 20) ordered:false ile
 * yeniden dener ve eşleşmeyen kullanıcıları rapor eder.
 */
async function runUserOps(
  snapshot: RolloverSnapshotEntry[],
  ops: UserBulkOp[],
): Promise<{ applied: number; failures: { userId: string; error: string }[] }> {
  if (ops.length === 0) return { applied: 0, failures: [] };

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await User.bulkWrite(ops, { ordered: true, session });
    if (result.matchedCount !== ops.length) {
      throw new Error(`bulkWrite matched ${result.matchedCount}/${ops.length}; rolling back`);
    }
    await session.commitTransaction();
    return { applied: result.matchedCount, failures: [] };
  } catch (txErr) {
    await session.abortTransaction().catch(() => undefined);
    logger.warn('Rollover transaction unavailable or failed, falling back to unordered bulkWrite', {
      error: txErr instanceof Error ? txErr.message : txErr,
    });

    await User.bulkWrite(ops, { ordered: false });

    // Hangi kullanıcının gerçekten yazıldığını doğrulamak için okuyoruz;
    // bulkWrite sonucu hangi op'un eşleşmediğini kullanıcı bazında vermiyor.
    const ids = snapshot.map((e) => e.userId);
    const found = (await User.find({ id: { $in: ids } })
      .select('id')
      .lean()) as unknown as { id: string }[];
    const foundSet = new Set(found.map((u) => u.id));

    const failures = snapshot
      .filter((e) => !foundSet.has(e.userId))
      .map((e) => ({ userId: e.userId, error: 'Kullanıcı bulunamadı' }));

    return { applied: ids.length - failures.length, failures };
  } finally {
    session.endSession();
  }
}
```

Dosyanın başındaki importlara `mongoose` ekle:

```ts
import mongoose from 'mongoose';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/test/modules/academicYear/applyRollover.test.ts`
Expected: PASS — 8 tests

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/academicYear/academicYearService.ts server/src/test/modules/academicYear/applyRollover.test.ts
git commit -m "feat(server): apply academic year rollover from snapshot"
```

---

### Task 9: `rollbackRollover` ve `cancelRollover`

**Files:**

- Modify: `server/src/modules/academicYear/academicYearService.ts`
- Test: `server/src/test/modules/academicYear/rollbackRollover.test.ts`

**Interfaces:**

- Consumes: Task 8'in tamamı
- Produces:

  ```ts
  export const ROLLBACK_WINDOW_DAYS = 30;
  export async function rollbackRollover(input: {
    rolloverId: string;
    admin: RolloverAdminContext;
  }): Promise<{ reverted: number; failures: { userId: string; error: string }[] }>;
  export async function cancelRollover(input: {
    rolloverId: string;
    admin: RolloverAdminContext;
  }): Promise<{ cancelled: number }>;
  ```

  Hata kodları: `ROLLOVER_NOT_APPLIED` (409), `ROLLOVER_NOT_REVERSIBLE` (409), `ROLLOVER_NOT_PENDING` (409).

- [ ] **Step 1: Write the failing test**

`server/src/test/modules/academicYear/rollbackRollover.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AcademicYearRollover, User } from '../../../models';
import {
  proposeRollover,
  applyRollover,
  rollbackRollover,
  cancelRollover,
} from '../../../modules/academicYear/academicYearService';

const admin = { id: 'admin_1', adSoyad: 'Test Admin' };

async function createStudent(id: string, sinif: string) {
  await User.create({
    id,
    adSoyad: `Öğrenci ${id}`,
    rol: 'student',
    sinif,
    sube: 'A',
    isActive: true,
    tokenVersion: 3,
    childId: [],
  });
}

describe('rollbackRollover', () => {
  let rolloverId: string;

  beforeEach(async () => {
    await createStudent('s9', '9');
    await createStudent('s12', '12');
    rolloverId = (await proposeRollover())!.rolloverId;
    await applyRollover({ rolloverId, admin });
  });

  it('sınıf seviyelerini geri alır', async () => {
    await rollbackRollover({ rolloverId, admin });
    expect((await User.findOne({ id: 's9' }))?.sinif).toBe('9');
  });

  it('mezunu tekrar aktif eder ve mezuniyetTarihi alanını siler', async () => {
    await rollbackRollover({ rolloverId, admin });

    const geriAlinan = await User.findOne({ id: 's12' });
    expect(geriAlinan?.isActive).toBe(true);
    expect(geriAlinan?.mezuniyetTarihi).toBeUndefined();
  });

  it('tokenVersion değerini azaltmaz — eski JWT geçersiz kalır', async () => {
    await rollbackRollover({ rolloverId, admin });
    expect((await User.findOne({ id: 's12' }))?.tokenVersion).toBe(4);
  });

  it('kaydı rolled_back durumuna geçirir', async () => {
    await rollbackRollover({ rolloverId, admin });

    const doc = await AcademicYearRollover.findOne({ rolloverId });
    expect(doc?.status).toBe('rolled_back');
    expect(doc?.rolledBackBy).toBe('admin_1');
  });

  it('ikinci geri alma reddedilir', async () => {
    await rollbackRollover({ rolloverId, admin });
    await expect(rollbackRollover({ rolloverId, admin })).rejects.toMatchObject({
      code: 'ROLLOVER_NOT_APPLIED',
    });
  });

  it('30 günden eski geçiş geri alınamaz', async () => {
    const eski = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await AcademicYearRollover.updateOne({ rolloverId }, { $set: { appliedAt: eski } });

    await expect(rollbackRollover({ rolloverId, admin })).rejects.toMatchObject({
      code: 'ROLLOVER_NOT_REVERSIBLE',
    });
    expect((await User.findOne({ id: 's9' }))?.sinif).toBe('10');
  });
});

describe('cancelRollover', () => {
  it('proposed kaydı iptal eder ve kullanıcılara dokunmaz', async () => {
    await createStudent('s10', '10');
    const rolloverId = (await proposeRollover())!.rolloverId;

    const result = await cancelRollover({ rolloverId, admin });

    expect(result.cancelled).toBe(1);
    expect((await AcademicYearRollover.findOne({ rolloverId }))?.status).toBe('cancelled');
    expect((await User.findOne({ id: 's10' }))?.sinif).toBe('10');
  });

  it('uygulanmış kaydı iptal etmez', async () => {
    await createStudent('s10', '10');
    const rolloverId = (await proposeRollover())!.rolloverId;
    await applyRollover({ rolloverId, admin });

    await expect(cancelRollover({ rolloverId, admin })).rejects.toMatchObject({
      code: 'ROLLOVER_NOT_PENDING',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/test/modules/academicYear/rollbackRollover.test.ts`
Expected: FAIL — `rollbackRollover` export edilmiyor

- [ ] **Step 3: Write the implementation**

`server/src/modules/academicYear/academicYearService.ts` sonuna ekle:

```ts
export const ROLLBACK_WINDOW_DAYS = 30;

function buildRollbackOps(snapshot: RolloverSnapshotEntry[]): UserBulkOp[] {
  return snapshot.map((entry) =>
    entry.action === 'graduate'
      ? {
          updateOne: {
            filter: { id: entry.userId },
            // tokenVersion'a dokunulmaz: mezuniyette bir artırılmıştı,
            // azaltmak o anda geçersiz kılınan JWT'leri yeniden geçerli
            // hale getirirdi. Öğrenci yeniden giriş yapar.
            update: {
              $set: { isActive: true, sinif: entry.fromSinif },
              $unset: { mezuniyetTarihi: '' },
            },
          },
        }
      : {
          updateOne: {
            filter: { id: entry.userId },
            update: { $set: { sinif: entry.fromSinif } },
          },
        },
  );
}

export async function rollbackRollover(input: {
  rolloverId: string;
  admin: RolloverAdminContext;
}): Promise<{ reverted: number; failures: { userId: string; error: string }[] }> {
  const existing = (await AcademicYearRollover.findOne({
    rolloverId: input.rolloverId,
  })) as IAcademicYearRollover | null;

  if (!existing || existing.status !== 'applied') {
    const err: NodeJS.ErrnoException = new Error(
      `Geçiş uygulanmış durumda değil: ${input.rolloverId}`,
    );
    err.code = 'ROLLOVER_NOT_APPLIED';
    throw err;
  }

  const windowMs = ROLLBACK_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  if (!existing.appliedAt || Date.now() - existing.appliedAt.getTime() > windowMs) {
    const err: NodeJS.ErrnoException = new Error(
      `Geri alma süresi doldu (${ROLLBACK_WINDOW_DAYS} gün)`,
    );
    err.code = 'ROLLOVER_NOT_REVERSIBLE';
    throw err;
  }

  const rollover = (await AcademicYearRollover.findOneAndUpdate(
    { rolloverId: input.rolloverId, status: 'applied' },
    {
      $set: {
        status: 'rolled_back',
        rolledBackAt: new Date(),
        rolledBackBy: input.admin.id,
      },
    },
    { new: true },
  )) as IAcademicYearRollover | null;

  if (!rollover) {
    const err: NodeJS.ErrnoException = new Error(
      `Geçiş uygulanmış durumda değil: ${input.rolloverId}`,
    );
    err.code = 'ROLLOVER_NOT_APPLIED';
    throw err;
  }

  const { applied, failures } = await runUserOps(
    rollover.snapshot,
    buildRollbackOps(rollover.snapshot),
  );

  logger.info(
    `Rolled back rollover ${rollover.fromYear} -> ${rollover.toYear}: ${applied} user(s) reverted`,
  );

  return { reverted: applied, failures };
}

export async function cancelRollover(input: {
  rolloverId: string;
  admin: RolloverAdminContext;
}): Promise<{ cancelled: number }> {
  const rollover = (await AcademicYearRollover.findOneAndUpdate(
    { rolloverId: input.rolloverId, status: 'proposed' },
    {
      $set: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: input.admin.id,
      },
    },
    { new: true },
  )) as IAcademicYearRollover | null;

  if (!rollover) {
    const err: NodeJS.ErrnoException = new Error(
      `Geçiş bulunamadı veya zaten işlenmiş: ${input.rolloverId}`,
    );
    err.code = 'ROLLOVER_NOT_PENDING';
    throw err;
  }

  return { cancelled: rollover.snapshot.length };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/test/modules/academicYear/rollbackRollover.test.ts`
Expected: PASS — 8 tests

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/academicYear/academicYearService.ts server/src/test/modules/academicYear/rollbackRollover.test.ts
git commit -m "feat(server): roll back and cancel academic year rollovers"
```

---

### Task 10: HTTP katmanı — controller, validator, rotalar

**Files:**

- Create: `server/src/modules/academicYear/academicYearController.ts`
- Create: `server/src/modules/academicYear/academicYearValidators.ts`
- Create: `server/src/modules/academicYear/academicYearRoutes.ts`
- Modify: `server/src/config/routes.ts:28` (import), `server/src/config/routes.ts:68` civarı (kayıt)
- Test: `server/src/test/routes/academicYearRoutes.test.ts`

**Interfaces:**

- Consumes: Task 7-9'un tüm export'ları
- Produces: `GET /api/academic-year/rollover/pending`, `POST /api/academic-year/rollover/propose`, `POST /api/academic-year/rollover/:rolloverId/apply`, `POST /api/academic-year/rollover/:rolloverId/rollback`, `DELETE /api/academic-year/rollover/:rolloverId`

- [ ] **Step 1: Write the failing test**

`server/src/test/routes/academicYearRoutes.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { User } from '../../models';
import { proposeRollover } from '../../modules/academicYear/academicYearService';
import { generateAccessToken } from '../../utils/jwt';

async function seedUsers() {
  await User.create({
    id: 'admin_1',
    adSoyad: 'Test Admin',
    rol: 'admin',
    isActive: true,
    childId: [],
  });
  await User.create({
    id: 'ogr_1',
    adSoyad: 'Test Öğrenci',
    rol: 'student',
    sinif: '9',
    sube: 'A',
    isActive: true,
    childId: [],
  });
}

describe('academic-year rotaları', () => {
  let adminToken: string;
  let studentToken: string;

  beforeEach(async () => {
    await seedUsers();
    adminToken = generateAccessToken({ userId: 'admin_1', role: 'admin' });
    studentToken = generateAccessToken({ userId: 'ogr_1', role: 'student' });
  });

  it('öğrenci erişemez', async () => {
    await request(app)
      .get('/api/academic-year/rollover/pending')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);
  });

  it('kimliksiz istek reddedilir', async () => {
    await request(app).get('/api/academic-year/rollover/pending').expect(401);
  });

  it('bekleyen geçiş yokken null döner', async () => {
    const res = await request(app)
      .get('/api/academic-year/rollover/pending')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.rollover).toBeNull();
  });

  it('bekleyen geçişi sayaçlarıyla döndürür', async () => {
    await proposeRollover();

    const res = await request(app)
      .get('/api/academic-year/rollover/pending')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.rollover.counts).toEqual({ '9->10': 1 });
    expect(res.body.rollover.snapshot).toHaveLength(1);
  });

  it('geçişi uygular', async () => {
    const rollover = await proposeRollover();

    const res = await request(app)
      .post(`/api/academic-year/rollover/${rollover!.rolloverId}/apply`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.promoted).toBe(1);
    expect((await User.findOne({ id: 'ogr_1' }))?.sinif).toBe('10');
  });

  it('ikinci uygulama 409 döner', async () => {
    const rollover = await proposeRollover();
    const url = `/api/academic-year/rollover/${rollover!.rolloverId}/apply`;

    await request(app).post(url).set('Authorization', `Bearer ${adminToken}`).expect(200);
    await request(app).post(url).set('Authorization', `Bearer ${adminToken}`).expect(409);
  });

  it('geçersiz rolloverId 400 döner', async () => {
    await request(app)
      .post('/api/academic-year/rollover/uuid-degil/apply')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/test/routes/academicYearRoutes.test.ts`
Expected: FAIL — tüm istekler 404

- [ ] **Step 3: Write the validators**

`server/src/modules/academicYear/academicYearValidators.ts`:

```ts
import { param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Doğrulama hatası', details: errors.array() });
  }
  next();
}

export const validateRolloverIdParam = [
  param('rolloverId').isUUID().withMessage('Geçersiz rolloverId'),
  handleValidationErrors,
];
```

- [ ] **Step 4: Write the controller**

`server/src/modules/academicYear/academicYearController.ts`:

```ts
import { Request, Response } from 'express';
import {
  proposeRollover,
  getPendingRollover,
  applyRollover,
  rollbackRollover,
  cancelRollover,
  summarizeSnapshot,
  RolloverAdminContext,
} from './academicYearService';
import { IAcademicYearRollover, User } from '../../models';
import logger from '../../utils/logger';
import { asyncHandler } from '../../middleware/errorHandler';

async function getAdminContext(req: Request): Promise<RolloverAdminContext> {
  const anyReq = req as unknown as { user?: { userId?: string } };
  const userId = anyReq.user?.userId;
  if (!userId) {
    throw new Error('Authenticated admin user missing on request');
  }
  const admin = await User.findOne({ id: userId }).select('id adSoyad').lean();
  if (!admin) {
    throw new Error('Admin user not found in database');
  }
  return {
    id: (admin as unknown as { id: string }).id,
    adSoyad: (admin as unknown as { adSoyad: string }).adSoyad,
  };
}

function httpStatusForCode(code?: string): number {
  switch (code) {
    case 'ROLLOVER_NOT_PENDING':
    case 'ROLLOVER_NOT_APPLIED':
    case 'ROLLOVER_NOT_REVERSIBLE':
      return 409;
    default:
      return 500;
  }
}

function handleServiceError(err: unknown, res: Response) {
  const e = err as NodeJS.ErrnoException;
  const status = httpStatusForCode(e.code);
  if (status >= 500) {
    logger.error('academicYear service error', { code: e.code, message: e.message });
  } else {
    logger.warn('academicYear domain error', { code: e.code, message: e.message });
  }
  res.status(status).json({ error: e.message, code: e.code });
}

function serializeRollover(rollover: IAcademicYearRollover) {
  return {
    rolloverId: rollover.rolloverId,
    fromYear: rollover.fromYear,
    toYear: rollover.toYear,
    status: rollover.status,
    proposedAt: rollover.proposedAt,
    appliedAt: rollover.appliedAt,
    counts: summarizeSnapshot(rollover.snapshot),
    snapshot: rollover.snapshot,
  };
}

export const pendingRollover = asyncHandler(async (_req, res) => {
  try {
    const rollover = await getPendingRollover();
    res.json({ rollover: rollover ? serializeRollover(rollover) : null });
  } catch (err) {
    handleServiceError(err, res);
  }
});

export const propose = asyncHandler(async (_req, res) => {
  try {
    const rollover = await proposeRollover();
    res.json({ rollover: rollover ? serializeRollover(rollover) : null });
  } catch (err) {
    handleServiceError(err, res);
  }
});

export const apply = asyncHandler(async (req, res) => {
  try {
    const admin = await getAdminContext(req);
    const result = await applyRollover({ rolloverId: req.params.rolloverId, admin });
    res.json(result);
  } catch (err) {
    handleServiceError(err, res);
  }
});

export const rollback = asyncHandler(async (req, res) => {
  try {
    const admin = await getAdminContext(req);
    const result = await rollbackRollover({ rolloverId: req.params.rolloverId, admin });
    res.json(result);
  } catch (err) {
    handleServiceError(err, res);
  }
});

export const cancel = asyncHandler(async (req, res) => {
  try {
    const admin = await getAdminContext(req);
    const result = await cancelRollover({ rolloverId: req.params.rolloverId, admin });
    res.json(result);
  } catch (err) {
    handleServiceError(err, res);
  }
});
```

- [ ] **Step 5: Write the routes and register them**

`server/src/modules/academicYear/academicYearRoutes.ts`:

```ts
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateJWT, authorizeRoles } from '../../utils/jwt';
import { pendingRollover, propose, apply, rollback, cancel } from './academicYearController';
import { validateRolloverIdParam } from './academicYearValidators';

// Adminler güvenilen operatörler — sadece DoS koruması.
const generalLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.use(authenticateJWT, authorizeRoles(['admin']), generalLimiter);

router.get('/rollover/pending', pendingRollover);
router.post('/rollover/propose', propose);
router.post('/rollover/:rolloverId/apply', validateRolloverIdParam, apply);
router.post('/rollover/:rolloverId/rollback', validateRolloverIdParam, rollback);
router.delete('/rollover/:rolloverId', validateRolloverIdParam, cancel);

export default router;
```

`server/src/config/routes.ts` — `passwordAdminRoutes` importunun altına:

```ts
import academicYearRoutes from '../modules/academicYear/academicYearRoutes';
```

`app.use('/api/admin/passwords', passwordAdminRoutes);` satırının altına:

```ts
app.use('/api/academic-year', academicYearRoutes);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd server && npx vitest run src/test/routes/academicYearRoutes.test.ts`
Expected: PASS — 7 tests

- [ ] **Step 7: Type-check**

Run: `cd server && npm run type-check`
Expected: hata yok

- [ ] **Step 8: Commit**

```bash
git add server/src/modules/academicYear server/src/config/routes.ts server/src/test/routes/academicYearRoutes.test.ts
git commit -m "feat(server): expose admin endpoints for academic year rollover"
```

---

### Task 11: Cron işi

**Files:**

- Modify: `server/src/services/SchedulerService.ts:12-38`
- Test: `server/src/test/modules/academicYear/rolloverNotification.test.ts`

**Interfaces:**

- Consumes: `proposeRollover`, `summarizeSnapshot` (Task 7), `NotificationService`, `PushNotificationService`
- Produces: `SchedulerService.proposeAcademicYearRollover(): Promise<void>`

- [ ] **Step 1: Write the failing test**

`server/src/test/modules/academicYear/rolloverNotification.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AcademicYearRollover, User } from '../../../models';
import { SchedulerService } from '../../../services/SchedulerService';
import { NotificationService } from '../../../services/NotificationService';

describe('SchedulerService.proposeAcademicYearRollover', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await User.create({
      id: 'admin_1',
      adSoyad: 'Test Admin',
      rol: 'admin',
      isActive: true,
      childId: [],
    });
    await User.create({
      id: 'ogr_1',
      adSoyad: 'Test Öğrenci',
      rol: 'student',
      sinif: '9',
      sube: 'A',
      isActive: true,
      childId: [],
    });
  });

  it('öneri üretir ve adminlere bildirim gönderir', async () => {
    const spy = vi
      .spyOn(NotificationService, 'createNotification')
      .mockResolvedValue(undefined as never);

    await SchedulerService.proposeAcademicYearRollover();

    expect(await AcademicYearRollover.countDocuments({ status: 'proposed' })).toBe(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toMatchObject({
      userId: 'admin_1',
      actionUrl: '/admin/ogretim-yili',
    });
  });

  it('öneri üretilmezse bildirim göndermez', async () => {
    const spy = vi
      .spyOn(NotificationService, 'createNotification')
      .mockResolvedValue(undefined as never);

    await SchedulerService.proposeAcademicYearRollover();
    spy.mockClear();
    await SchedulerService.proposeAcademicYearRollover();

    expect(spy).not.toHaveBeenCalled();
    expect(await AcademicYearRollover.countDocuments()).toBe(1);
  });

  it('bildirim hatası öneriyi geri almaz', async () => {
    vi.spyOn(NotificationService, 'createNotification').mockRejectedValue(new Error('SMTP down'));

    await SchedulerService.proposeAcademicYearRollover();

    expect(await AcademicYearRollover.countDocuments({ status: 'proposed' })).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/test/modules/academicYear/rolloverNotification.test.ts`
Expected: FAIL — `proposeAcademicYearRollover` metodu yok

- [ ] **Step 3: Add the cron job and method**

`server/src/services/SchedulerService.ts` — importlara ekle:

```ts
import { proposeRollover, summarizeSnapshot } from '../modules/academicYear/academicYearService';
```

`initialize()` içine, `logger.info('SchedulerService initialized...')` satırından önce:

```ts
// 1 Ağustos 03:00 (Europe/Istanbul) = 1 Ağustos 00:00 UTC — öğretim yılı
// geçiş önerisi. Kayıtlara dokunmaz, adminin onayını bekler.
cron.schedule(
  '0 3 1 8 *',
  async () => {
    logger.info('Running academic year rollover proposal job (1 August 03:00 Turkey time)');
    try {
      await SchedulerService.proposeAcademicYearRollover();
    } catch (error) {
      logger.error('Academic year rollover proposal job failed', { error });
    }
  },
  {
    timezone: 'Europe/Istanbul',
  },
);
```

Ve son `logger.info` çağrısını güncelle:

```ts
logger.info(
  'SchedulerService initialized — evci reminders (Thu 16:00), escalation (Fri 08:00), academic year rollover (1 Aug 03:00)',
);
```

Sınıfa yeni metot ekle:

```ts
  /**
   * Öğretim yılı geçiş önerisi üretir ve adminlere haber verir.
   * Öneri üretilmezse (zaten var veya aktif öğrenci yok) sessizce çıkar.
   */
  static async proposeAcademicYearRollover(): Promise<void> {
    const rollover = await proposeRollover();
    if (!rollover) return;

    const counts = summarizeSnapshot(rollover.snapshot);
    const graduating = counts.graduate ?? 0;
    const promoting = rollover.snapshot.length - graduating;
    const message =
      `${rollover.fromYear} öğretim yılı sona erdi. ` +
      `${promoting} öğrenci bir üst sınıfa geçecek, ${graduating} öğrenci mezun edilecek. ` +
      `İşlem sizin onayınızı bekliyor.`;

    const admins = await User.find({ rol: 'admin', isActive: true });

    for (const admin of admins) {
      try {
        await NotificationService.createNotification({
          userId: admin.id,
          title: 'Öğretim Yılı Geçişi Onay Bekliyor',
          message,
          type: 'warning',
          priority: 'high',
          category: 'administrative',
          sendEmail: true,
          emailSubject: `Öğretim Yılı Geçişi — ${rollover.toYear}`,
          actionUrl: '/admin/ogretim-yili',
          actionText: 'Geçişi İncele',
        });

        PushNotificationService.sendToUser(admin.id, {
          title: 'Öğretim Yılı Geçişi Onay Bekliyor',
          body: message,
          url: '/admin/ogretim-yili',
        }).catch(() => {});
      } catch (err) {
        logger.error(`Failed to send rollover notification to admin ${admin.id}`, { error: err });
      }
    }

    logger.info(`Rollover proposal notified to ${admins.length} admin(s)`);
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/test/modules/academicYear/rolloverNotification.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 5: Run the whole server suite**

Run: `cd server && npm run test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/services/SchedulerService.ts server/src/test/modules/academicYear/rolloverNotification.test.ts
git commit -m "feat(server): schedule academic year rollover proposal for 1 August"
```

---

### Task 12: Admin arayüzü

**Files:**

- Create: `client/src/pages/Dashboard/OgretimYiliPage.tsx`
- Modify: `client/src/utils/apiEndpoints.ts:361` civarı
- Modify: `client/src/routes/AppRoutes.tsx:65` (lazy import), `client/src/routes/AppRoutes.tsx:297` civarı (rota)
- Test: `client/src/pages/Dashboard/__tests__/OgretimYiliPage.test.tsx`

**Interfaces:**

- Consumes: Task 10'un endpoint'leri
- Produces: `/admin/ogretim-yili` rotası

**Uyulacak repo kuralları:**

- `SecureAPI.get` tam axios response döndürür — gövdeye `.data` ile erişilir.
- Yıkıcı işlem onayı için native `confirm` değil, repodaki özel confirm dialog bileşeni kullanılır. Bileşeni `SenkronizasyonPage.tsx`'in silme akışından birebir kopyala.
- Tailwind v4 utility sınıfları; gradient, glassmorphism ve mor tonlar kullanılmaz. Tek vurgu rengi olarak sayfanın mevcut Tofaş marka rengi kullanılır.
- Dekoratif emoji kullanılmaz.

- [ ] **Step 1: Add the endpoints**

`client/src/utils/apiEndpoints.ts` — `PASSWORD_ADMIN_ENDPOINTS` bloğunun altına:

```ts
export const ACADEMIC_YEAR_ENDPOINTS = {
  PENDING_ROLLOVER: '/api/academic-year/rollover/pending',
  PROPOSE_ROLLOVER: '/api/academic-year/rollover/propose',
  APPLY_ROLLOVER: (rolloverId: string) => `/api/academic-year/rollover/${rolloverId}/apply`,
  ROLLBACK_ROLLOVER: (rolloverId: string) => `/api/academic-year/rollover/${rolloverId}/rollback`,
  CANCEL_ROLLOVER: (rolloverId: string) => `/api/academic-year/rollover/${rolloverId}`,
};
```

- [ ] **Step 2: Write the failing component test**

`client/src/pages/Dashboard/__tests__/OgretimYiliPage.test.tsx` — kurulumu (QueryClientProvider sarmalayıcısı, `SecureAPI` mock'u, router mock'u) `SenkronizasyonPage.test.tsx`'ten birebir kopyala, ardından:

```tsx
describe('OgretimYiliPage', () => {
  it('bekleyen geçiş yokken bilgi mesajı gösterir', async () => {
    mockGet.mockResolvedValue({ data: { rollover: null } });

    render(<OgretimYiliPage />);

    expect(await screen.findByText(/bekleyen bir öğretim yılı geçişi yok/i)).toBeInTheDocument();
  });

  it('bekleyen geçişin sayaçlarını gösterir', async () => {
    mockGet.mockResolvedValue({
      data: {
        rollover: {
          rolloverId: '11111111-1111-4111-8111-111111111111',
          fromYear: '2025-2026',
          toYear: '2026-2027',
          status: 'proposed',
          counts: { '9->10': 84, graduate: 76 },
          snapshot: [],
        },
      },
    });

    render(<OgretimYiliPage />);

    expect(await screen.findByText('2025-2026 → 2026-2027')).toBeInTheDocument();
    expect(await screen.findByText('84')).toBeInTheDocument();
    expect(await screen.findByText('76')).toBeInTheDocument();
  });

  it('mezun olacakları ayrı bir bölümde listeler', async () => {
    mockGet.mockResolvedValue({
      data: {
        rollover: {
          rolloverId: '11111111-1111-4111-8111-111111111111',
          fromYear: '2025-2026',
          toYear: '2026-2027',
          status: 'proposed',
          counts: { graduate: 1 },
          snapshot: [
            { userId: 'ogr_1', adSoyad: 'Ayşe Yılmaz', fromSinif: '12', action: 'graduate' },
          ],
        },
      },
    });

    render(<OgretimYiliPage />);

    expect(await screen.findByText(/hesabı kapatılacak/i)).toBeInTheDocument();
    expect(await screen.findByText('Ayşe Yılmaz')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd client && npx vitest run src/pages/Dashboard/__tests__/OgretimYiliPage.test.tsx`
Expected: FAIL — `OgretimYiliPage` modülü yok

- [ ] **Step 4: Build the page**

`client/src/pages/Dashboard/OgretimYiliPage.tsx` şunları içerir:

- `useQuery` ile `ACADEMIC_YEAR_ENDPOINTS.PENDING_ROLLOVER` çekilir; yanıt `res.data.rollover`.
- `rollover === null` ise: "Şu anda bekleyen bir öğretim yılı geçişi yok." metni ve `PROPOSE_ROLLOVER`'ı çağıran "Geçişi Şimdi Hazırla" butonu (cron kaçtıysa diye).
- `rollover` varsa başlıkta `{fromYear} → {toYear}`, altında `counts` girdileri için sayaç kutuları. `graduate` anahtarının etiketi "Mezun olacak", diğerleri `"9. sınıftan 10. sınıfa"` biçiminde okunur hale getirilir.
- `snapshot`'ta `action === 'graduate'` olanlar ayrı ve görünür bir bölümde, "Bu öğrencilerin hesabı kapatılacak" başlığıyla listelenir.
- "Uygula" butonu özel confirm dialog açar; onaylanınca `APPLY_ROLLOVER` çağrılır, `useMutation` başarısında pending sorgusu invalidate edilir.
- "İptal Et" butonu `CANCEL_ROLLOVER` çağırır, o da confirm dialog arkasında.
- `status === 'applied'` ve `appliedAt` 30 günden yeniyse "Geri Al" butonu `ROLLBACK_ROLLOVER` çağırır, confirm dialog arkasında.
- Yükleme durumunda repodaki skeleton bileşeni, hata durumunda mevcut toast bileşeni kullanılır.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd client && npx vitest run src/pages/Dashboard/__tests__/OgretimYiliPage.test.tsx`
Expected: PASS — 3 tests

- [ ] **Step 6: Wire up the route**

`client/src/routes/AppRoutes.tsx` — 65. satır civarına:

```tsx
const OgretimYiliPage = lazy(() => import('../pages/Dashboard/OgretimYiliPage'));
```

`/admin/senkronizasyon` rotasının altına:

```tsx
<Route
  path="/admin/ogretim-yili"
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <OgretimYiliPage />
    </ProtectedRoute>
  }
/>
```

`SenkronizasyonPage.tsx`'e `/admin/ogretim-yili` sayfasına giden bir bağlantı ekle.

- [ ] **Step 7: Verify the client actually builds**

Run: `cd client && npx vite build`
Expected: başarılı build.

> `npm run type-check` tek başına yeterli değil: `moduleResolution: bundler` ayarı, Rollup'ın reddettiği çıplak import belirteçlerini kabul ediyor. İstemci değişikliği `vite build` geçmeden tamamlanmış sayılmaz.

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/Dashboard/OgretimYiliPage.tsx client/src/pages/Dashboard/__tests__/OgretimYiliPage.test.tsx client/src/pages/Dashboard/SenkronizasyonPage.tsx client/src/utils/apiEndpoints.ts client/src/routes/AppRoutes.tsx
git commit -m "feat(client): add academic year rollover admin page"
```

---

## Kapanış doğrulaması

- [ ] `cd server && npm run test` — tamamı yeşil
- [ ] `cd client && npm run test` — tamamı yeşil
- [ ] `cd client && npx vite build` — başarılı
- [ ] `npm run lint` — temiz
- [ ] `npm run type-check` — temiz
- [ ] Migration'ın gerçek veritabanında çalıştırılması dağıtım adımıdır: `cd server && npm run migrate:up`. Bu plan kapsamında **üretim veritabanında çalıştırılmaz** — `server/.env` içindeki `MONGODB_URI` canlı Atlas kümesini gösteriyor.
