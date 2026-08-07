# Öğretim Yılı Geçişi (Sınıf Terfisi ve Mezuniyet)

Tarih: 2026-07-22
Durum: Tasarım onaylandı, uygulama planı bekliyor

## Problem

Her öğretim yılı sonunda öğrencilerin sınıf seviyesi elle güncelleniyor. 12. sınıfı bitiren
öğrencilerin hesapları sistemde aktif kalmaya devam ediyor. Ayrıca `Homework` ve `Schedule`
kayıtları öğrenciye değil `classLevel` + `classSection` çiftine bağlı olduğu için, sınıf
seviyesi güncellendiğinde geçen yılın ödevleri ve ders programı yeni öğrencilere görünür hale
geliyor.

## Kapsam

Bu spec yalnızca öğretim yılı geçişini kapsar. Gemini destekli yeni kayıt içe aktarma ayrı bir
spec ve ayrı bir PR'dır (`2026-07-22-gemini-destekli-ice-aktarma-design.md`). İki özellik
yalnızca Senkronizasyon sayfasını paylaşır; bu spec önce uygulanır.

### Kapsam dışı

- Yeni öğrenci kaydı (ayrı spec)
- Sınıf tekrarı / sınıfta kalma iş akışı — tüm aktif öğrenciler terfi eder, istisna admin
  tarafından terfi sonrası tek tek düzeltilir
- Şube yeniden dağıtımı — şube olduğu gibi korunur
- Mezun öğrencinin velisinin hesabına dokunulması

## Kararlar

| Konu                      | Karar                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| Tetikleme                 | Cron öneri üretir, admin onaylar. Cron hiçbir kaydı değiştirmez.                           |
| Mezun hesabı              | `isActive=false`, `mezuniyetTarihi` set, `tokenVersion++`. Silinmez, `sinif` `'12'` kalır. |
| Şube                      | Aynen korunur (9A → 10A).                                                                  |
| Eski öğretim yılı içeriği | `academicYear` alanıyla otomatik arşivlenir; terfi işlemi bu kayıtlara dokunmaz.           |
| Geri alma                 | Uygulandıktan sonra 30 gün açık, snapshot üzerinden.                                       |

## Mimari

### 1. Öğretim yılı kavramı

Yeni util: `server/src/utils/academicYear.ts`

```ts
/** Tarihten türetilir; kalıcı state yok. Sınır: 1 Ağustos. */
export function getAcademicYear(date: Date = new Date()): string;
// 2026-07-31 -> "2025-2026"
// 2026-08-01 -> "2026-2027"
```

Sistemde "içinde bulunulan öğretim yılı" için tek doğruluk kaynağı budur. Ayrı bir ayar
modeli veya admin tarafından set edilen bir alan yoktur — böylece iki kaynak arasında
tutarsızlık oluşamaz.

### 2. Arşivleme — terfi işlemi hiçbir kayda dokunmaz

**Mevcut durum tespiti:** `Schedule.academicYear` (`required: true`) ve `Note.academicYear`
zaten var. `Schedule` route'u alanı `/^\d{4}-\d{4}$/` regex'iyle doğruluyor — yani
`getAcademicYear()` çıktı formatıyla birebir uyumlu. Eksik olan tek model `Homework`.

Bu yüzden model değişikliği tek modele iner:

```ts
// Homework.ts — yeni alan
academicYear: { type: String, required: true, default: () => getAcademicYear(), index: true }
```

Kayıt oluşturulduğu andaki öğretim yılını taşır. 1 Ağustos'ta sınır kaydığı için geçen yılın
kayıtları listelerden kendiliğinden düşer; terfi işleminin arşiv için yazma yapması gerekmez
ve geri alma da kendiliğinden doğru kalır.

`Schedule` tarafında **model değişmez**. Değişen tek şey okuma filtresi: `academicYear` query
parametresi verilmediğinde şu an tüm yılların kayıtları dönüyor; içinde bulunulan yıl
varsayılan hale getirilir.

`Note` **hiç değişmez.** Notlar öğrenciye (`studentId`) bağlı, sınıf seviyesine değil; ayrıca
transkript için geçmiş yılların görünür kalması gerekir.

Arşive erişim: listeleme endpoint'lerine opsiyonel `?academicYear=2025-2026` query parametresi.
Değer verilmezse içinde bulunulan yıl kullanılır.

Mevcut kayıtlar için tek seferlik migration: `server/src/migrations/004-backfill-homework-academic-year.ts`
— `academicYear` alanı olmayan `Homework` dokümanlarını migration'ın çalıştığı andaki öğretim
yılıyla damgalar. `Schedule` ve `Note` migration kapsamı dışında.

**Bilinen davranış:** Arşiv sınırı 1 Ağustos'ta tarihe göre kayar, admin terfiyi uygulamasa
bile. Yani 1–5 Ağustos arasında öğrenciler hâlâ eski sınıfındayken ödev listeleri boş görünür.
Ağustos başında ders olmadığı için kabul edilebilir; alternatifi (arşivi terfi uygulamasına
bağlamak) geri almayı bozar ve iki doğruluk kaynağı yaratır.

### 3. Yeni model: `AcademicYearRollover`

`server/src/models/AcademicYearRollover.ts`

```ts
export type RolloverStatus = 'proposed' | 'applied' | 'rolled_back' | 'cancelled';

export interface RolloverSnapshotEntry {
  userId: string;
  adSoyad: string;
  fromSinif: string; // '9' | '10' | '11' | '12'
  action: 'promote' | 'graduate';
}

export interface IAcademicYearRollover extends Document {
  rolloverId: string; // randomUUID
  fromYear: string; // "2025-2026"
  toYear: string; // "2026-2027"  — unique index
  status: RolloverStatus;
  snapshot: RolloverSnapshotEntry[];
  proposedAt: Date;
  appliedAt?: Date;
  appliedBy?: string; // admin id
  rolledBackAt?: Date;
  rolledBackBy?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
}
```

Indeksler: `rolloverId` unique, `toYear` unique (cron idempotency'yi veritabanı seviyesinde
garanti eder), `status`.

Boyut: ~500 öğrenci × ~70 bayt ≈ 35 KB. 16 MB doküman limitinin çok altında.

### 4. User modeli değişikliği

Tek yeni alan:

```ts
mezuniyetTarihi?: Date;   // index: true — mezun listeleri için
```

`sinif` enum'u (`'9'|'10'|'11'|'12'`) değişmez. Mezun öğrencide `'12'` kalır; transkript ve
belge işlemlerinde son sınıf bilgisi gerekir. Mezunluk `mezuniyetTarihi`'nin varlığından
anlaşılır, `isActive=false` tek başına ayırt edici değildir (idari olarak kilitlenmiş
hesaplar da pasiftir).

`shared/types/user.ts` içindeki `User` tipine de aynı alan eklenir.

### 5. Akış

#### 5.1 Öneri (cron)

`SchedulerService.initialize()` içine üçüncü iş:

```ts
cron.schedule('0 3 1 8 *', ..., { timezone: 'Europe/Istanbul' });
```

`proposeRollover()`:

1. `toYear = getAcademicYear()`, `fromYear` = bir önceki yıl
2. `AcademicYearRollover.findOne({ toYear })` varsa çık (idempotent — restart, yeniden deploy
   veya elle tetikleme ikinci kayıt üretmez)
3. `User.find({ rol: 'student', isActive: true, sinif: { $in: ['9','10','11','12'] } })`
4. Snapshot kur: `sinif === '12'` → `graduate`, diğerleri → `promote`
5. `status: 'proposed'` kaydı oluştur — **hiçbir User kaydına dokunulmaz**
6. Tüm adminlere `NotificationService.createNotification` (`type: 'warning'`,
   `priority: 'high'`, `category: 'administrative'`, `actionUrl: '/admin/ogretim-yili'`) +
   `PushNotificationService.sendToUser` (best-effort, `.catch(() => {})`)

Snapshot boşsa (aktif öğrenci yok) kayıt oluşturulmaz, sadece log yazılır.

#### 5.2 Önizleme

`GET /api/academic-year/rollover/pending` → `status: 'proposed'` olan kayıt (en fazla bir
tane) ve özet:

```json
{
  "rolloverId": "...",
  "fromYear": "2025-2026",
  "toYear": "2026-2027",
  "counts": { "9->10": 84, "10->11": 79, "11->12": 81, "graduate": 76 },
  "snapshot": [{ "userId": "...", "adSoyad": "...", "fromSinif": "12", "action": "graduate" }]
}
```

`counts` snapshot'tan hesaplanır, ayrıca saklanmaz.

#### 5.3 Uygulama

`POST /rollover/:rolloverId/apply`

1. Atomik CAS — `activateImportBatch`'teki desenle birebir aynı:
   ```ts
   findOneAndUpdate(
     { rolloverId, status: 'proposed' },
     { $set: { status: 'applied', appliedAt: new Date(), appliedBy: admin.id } },
     { new: true },
   );
   ```
   `null` dönerse `ROLLOVER_NOT_PENDING` hatası. İki eşzamanlı istek ikinci kez terfi
   uygulayamaz.
2. Snapshot'tan `bulkWrite` op listesi:
   - `promote` → `{ $set: { sinif: String(Number(fromSinif) + 1) } }`
   - `graduate` → `{ $set: { isActive: false, mezuniyetTarihi: now }, $inc: { tokenVersion: 1 } }`

   **Snapshot bazlı, kullanıcı bazlı işlem şart.** Alternatif olan zincirleme
   `updateMany({sinif:'9'} → '10')`, `updateMany({sinif:'10'} → '11')` yaklaşımı aynı
   öğrenciyi iki kez terfi ettirir. Snapshot yaklaşımında bu hata yapısal olarak imkânsız.

3. `regenerateImportBatchPasswords`'taki transaction deseni: replica set varsa
   `session` + `bulkWrite({ ordered: true })` + `matchedCount` doğrulaması, standalone
   Mongo'da (kod 20) `ordered: false` fallback ve eşleşmeyen kayıtların rapor edilmesi.
4. Dönüş: `{ promoted: n, graduated: m, failures: [...] }`

`tokenVersion` artışı mezunun açık JWT oturumlarını anında geçersiz kılar — hesap
kapanışı bir sonraki token yenilemesini beklemez.

#### 5.4 Geri alma

`POST /rollover/:rolloverId/rollback`

- Yalnızca `status: 'applied'` ve `appliedAt` 30 günden yeni ise. Aksi halde
  `ROLLOVER_NOT_REVERSIBLE`.
- CAS ile `'applied'` → `'rolled_back'`, sonra snapshot ters uygulanır:
  - `promote` → `sinif = fromSinif`
  - `graduate` → `isActive: true`, `$unset: { mezuniyetTarihi: '' }`. **`tokenVersion`'a
    dokunulmaz** — mezuniyette bir artırılmıştı, azaltmak o anda geçersiz kılınan JWT'leri
    yeniden geçerli hale getirirdi. Öğrenci yeniden giriş yapar.
- Arşivlemeye dokunulmaz — `academicYear` tarihten türetildiği için zaten tutarlı.

#### 5.5 İptal

`DELETE /rollover/:rolloverId` — yalnızca `proposed` durumunda, CAS ile `'cancelled'`.
Terfinin o yıl elle yapılacağı durumlar için.

### 6. Modül yerleşimi

`server/src/modules/academicYear/`

```
academicYearRoutes.ts       # authenticateJWT + authorizeRoles(['admin']) + rateLimit
academicYearController.ts
academicYearService.ts      # proposeRollover, applyRollover, rollbackRollover, cancelRollover
academicYearValidators.ts   # rolloverId param doğrulama
__tests__/
```

Rota tabanı: `/api/academic-year`. Rate limit `passwordAdminRoutes`'taki `generalLimiter`
ile aynı ayar (60 sn / 100 istek).

`proposeRollover` servis fonksiyonu `SchedulerService` tarafından çağrılır; ayrıca
`POST /rollover/propose` ile admin elle de tetikleyebilir (cron kaçtıysa). İdempotency
`toYear` unique indeksinden gelir, iki yol da güvenli.

### 7. İstemci

`client/src/pages/Dashboard/` altında yeni sayfa (`OgretimYiliPage.tsx`), Senkronizasyon
sayfasından link. İçerik:

- Bekleyen öneri kartı: fromYear → toYear, sayaçlar, "Uygula" / "İptal Et"
- Uygulama öncesi onay: mevcut özel confirm dialog bileşeni kullanılır
  (native `confirm` değil — repoda zaten değiştirildi)
- Mezun olacakların listesi ayrı ve görünür şekilde gösterilir; bu geri alınabilir ama
  yıkıcı bir işlem
- Uygulanmış kayıt için 30 gün boyunca "Geri Al" butonu

`SecureAPI.get` tam axios response döndürür, `.data` okunmalı. Yeni endpoint'ler
`{ success, data }` zarfını kullanır (Performance modülüyle tutarlı).

## Hata durumları

| Durum                               | Davranış                                                              |
| ----------------------------------- | --------------------------------------------------------------------- |
| Cron çalıştığında aktif öğrenci yok | Kayıt oluşturulmaz, log yazılır                                       |
| Aynı `toYear` için kayıt zaten var  | Sessizce çıkılır (idempotent)                                         |
| İki admin aynı anda "Uygula"        | CAS sayesinde biri başarılı, diğeri `ROLLOVER_NOT_PENDING`            |
| Standalone Mongo (transaction yok)  | `ordered: false` fallback, eşleşmeyenler `failures` içinde raporlanır |
| Geri alma 30 gün sonrası            | `ROLLOVER_NOT_REVERSIBLE`                                             |
| Snapshot'taki öğrenci silinmiş      | `bulkWrite` eşleşmez, `failures` içinde raporlanır, işlem devam eder  |

## Test planı

**Birim (`server/src/test/`)**

- `getAcademicYear`: 2026-07-31 → `"2025-2026"`, 2026-08-01 → `"2026-2027"`, yıl sonu sınırı
- `proposeRollover`: snapshot doğru kurulur; 12'ler `graduate`, diğerleri `promote`;
  pasif öğrenciler dahil edilmez; ikinci çağrı yeni kayıt üretmez
- `applyRollover`: sınıf seviyeleri bir artar, 12'ler pasifleşir ve `mezuniyetTarihi` alır,
  `tokenVersion` artar, şube değişmez
- `applyRollover` çifte çağrı: ikincisi `ROLLOVER_NOT_PENDING`, veri bir kez terfi eder
- `rollbackRollover`: sınıflar geri döner, mezunlar aktifleşir, `tokenVersion` azalmaz
- 30 gün sınırı testi

**Entegrasyon**

- `/rollover/*` rotaları admin dışı rollerde 403
- Uçtan uca: propose → preview → apply → rollback

**Migration**

- `004-backfill-homework-academic-year` alanı olmayan `Homework` kayıtlarını damgalar,
  zaten damgalı olanlara dokunmaz

Sunucu tarafı coverage eşiği %80. Testler `TEST_MONGODB_URI` ile çalıştırılır.

## Uygulama sırası

1. `getAcademicYear` util + testleri
2. `Homework.academicYear` alanı + migration 004; `Homework` ve `Schedule` okuma
   filtrelerinin içinde bulunulan yıla varsayılanlanması
3. `User.mezuniyetTarihi` + `shared/types/user.ts`
4. `AcademicYearRollover` modeli
5. `academicYear` modülü (servis → controller → rotalar) + testleri
6. `SchedulerService` cron kaydı
7. İstemci sayfası
