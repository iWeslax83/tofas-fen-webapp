# Şifre Yönetimi (Password Management) — Design

**Tarih:** 2026-04-20
**Tetikleyici:** `öğrenci tüm liste 20042026.XLS` (444 öğrenci, 16 sınıf) içe aktarımı + kurum genelinde şifre yaşam döngüsü yönetimi

## Amaç

Admin panelinde tek bir sayfadan:

1. Tofaş sınıf listesi XLS'ini içe aktarmak ve her öğrenciye rastgele şifre üretmek.
2. Her yıl eklenen yeni öğrenci/öğretmen/velilere şifre üretmek.
3. Şifresini unutan kullanıcıya yeni rastgele şifre atamak.
4. Hangi kullanıcının şifresinin ne zaman, kim tarafından, hangi sebeple üretildiğini/yenilendiğini izlemek.

TCKN tabanlı login'den vazgeçildi. Sistem `sifre` (bcrypt hash) alanına geri döner.

## Kapsam Dışı

- Kullanıcıya bildirim gönderimi (e-posta/push). Kapsam dışı.
- Zorunlu ilk-giriş şifre değişimi. Kapsam dışı (gelecekte `mustChangePassword` flag'iyle eklenebilir).
- Self-service şifre sıfırlama. Mevcut `passwordResetTokenHash` flow'u korunur; bu design admin-tarafı yönetime odaklıdır.

## Mimari

### Yeni admin sayfası: `/yonetici/sifre-yonetimi`

Üç sekme, tek sayfa:

**1. Toplu İçe Aktar**

- Tofaş formatında XLS yükleme (çok-bloklu sınıf listesi).
- Önizleme: toplam kayıt, sınıf dağılımı, doğrulama hataları, mevcut ID çakışmaları.
- "İçe Aktar ve Şifre Üret" aksiyonu:
  - Kullanıcılar `isActive: false` olarak DB'ye yazılır.
  - Her kayda rastgele şifre üretilir, sadece hash DB'ye gider.
  - Response'ta `credentialsFile` (base64 XLSX) + `batchId` döner.
  - Admin dosyayı indirir.
- İndirdikten sonra "Öğrencileri Aktif Et" aksiyonu → `POST /api/admin/passwords/activate-batch` → o batch'teki tüm kullanıcıların `isActive: true` yapılır.
- Admin dosyayı indirmeden sayfayı kapatırsa: kayıtlar `isActive: false` olarak kalır. "Bekleyen Batch'ler" bölümünde görünür, admin yeni şifre üretip tekrar indirebilir veya batch'i silebilir.

**2. Kullanıcılar**

- Tüm kullanıcı listesi (mevcut admin user list pattern'i yeniden kullanılır).
- Filtreler: rol, sınıf, şube, pansiyon, "şifresi var mı" (`passwordLastSetAt` ile).
- Her satırda iki buton:
  - "Yeni Şifre Üret" — `passwordLastSetAt == null` olanlar için
  - "Şifre Sıfırla" — şifresi zaten varsa
- Butona tıklanınca: reason dropdown modali → onay → şifre üretilir → `PasswordRevealModal` açılır.

**3. Geçmiş (Audit Log)**

- Sayfalı liste. Kolonlar: Zaman, Kullanıcı (id + ad), Admin (id + ad), Aksiyon, Sebep, IP.
- Şifre değeri **asla** loglanmaz.
- Filtreler: tarih aralığı, admin, kullanıcı, aksiyon tipi, sebep.

### Tekil kullanıcı oluşturma akışı (mevcut formla entegrasyon)

Mevcut "Kullanıcı Ekle" formuna bir checkbox: **"Şifreyi otomatik üret"** (varsayılan açık).

- Checkbox açıkken: form submit → kullanıcı oluşturulur → `POST /api/admin/passwords/generate/:userId` otomatik çağrılır → `PasswordRevealModal` açılır → admin şifreyi kopyalar.
- Checkbox kapalı: admin şifreyi manuel girer (eski davranış).
- `passwordGenerate/:userId` rotası idempotent değildir; aynı kullanıcı için ikinci çağrıda 409 döner (reset rotası kullanılmalı).

### Pending batch yönetimi

Admin credentials dosyasını indirmeden sayfayı kapatırsa veya dosyayı kaybederse:

- Batch `status: 'pending'` olarak durur, kullanıcılar `isActive: false`.
- "Bekleyen Batch'ler" listesinde görünür: `GET /api/admin/passwords/batches?status=pending`.
- İki seçenek:
  - **Şifreleri Yeniden Üret:** `POST /api/admin/passwords/batch/:batchId/regenerate` → batch'teki tüm kullanıcılara **yeni** rastgele şifre üretilir, eski hash'ler üzerine yazılır, yeni credentials XLSX döner, yeni audit log kayıtları oluşur. Eski hash'ler kurtarılamaz (plaintext hiç saklanmadığı için zaten mümkün değil).
  - **Batch'i Sil:** `DELETE /api/admin/passwords/batch/:batchId` → batch'teki kullanıcılar DB'den silinir (hard delete, çünkü hiç aktif olmadılar).

### Backend Modülü: `server/src/modules/passwordAdmin/`

Dosya yapısı (her dosya <300 LoC):

```
passwordAdmin/
├── passwordGenerator.ts        # crypto.randomBytes tabanlı üretim
├── classListParser.ts          # Tofaş çok-bloklu XLS parser
├── credentialsExporter.ts      # ExcelJS ile in-memory XLSX üretimi
├── passwordAuditService.ts     # Audit log CRUD
├── passwordAdminService.ts     # Business logic (reset, generate, bulk)
├── passwordAdminController.ts  # Route handler'lar
├── passwordAdminRoutes.ts      # Router tanımı
└── passwordAdminValidators.ts  # Zod/joi doğrulayıcılar
```

Ana uygulamaya `app.use('/api/admin/passwords', passwordAdminRoutes)` olarak mount edilir.

### Yeni Model: `PasswordAuditLog`

```ts
{
  userId: string;           // Şifresi üretilen/resetlenen kullanıcı (indexed)
  userSnapshot: {           // Kullanıcı silinse bile kayıt okunabilsin diye anlık kopya
    id: string;
    adSoyad: string;
    rol: string;
  };
  adminId: string;          // İşlemi yapan admin (indexed)
  adminSnapshot: {
    id: string;
    adSoyad: string;
  };
  action: 'bulk_import' | 'admin_generated' | 'admin_reset';
  reason: 'forgot' | 'security' | 'new_user' | 'bulk_import' | 'other';
  reasonNote?: string;      // 'other' seçildiyse serbest metin (maks 280 char)
  batchId?: string;         // bulk_import aksiyonları için
  ip?: string;
  userAgent?: string;
  createdAt: Date;          // indexed descending
}
```

**Compound index'ler:** `{ userId: 1, createdAt: -1 }`, `{ adminId: 1, createdAt: -1 }`, `{ action: 1, createdAt: -1 }`.

### Yeni Model: `PasswordImportBatch`

```ts
{
  batchId: string;          // UUID (indexed, unique)
  adminId: string;
  userIds: string[];        // Bu batch'te oluşturulan kullanıcı ID'leri
  totalCount: number;
  status: 'pending' | 'activated' | 'cancelled';
  createdAt: Date;
  activatedAt?: Date;
  cancelledAt?: Date;
}
```

Batch kaydı, plaintext şifre içermez. Şifreler yalnızca response XLSX'inde (in-memory), bir kez döner.

### User modeline ekleme

```ts
passwordLastSetAt?: Date;   // Filtreleme ("şifresi hazır mı") için, index'li
importBatchId?: string;     // Pending batch'leri listelerken kullanılır, sparse index
```

`sifre` alanı ve bcrypt flow'u aynı kalır. `tckn` alanı dokunulmaz (geriye dönük veri kayıpsız korunur).

### Rotalar (hepsi `authorizeRoles(['admin'])`)

| Metot  | Yol                                                                                  | Açıklama                                                                                              |
| ------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| POST   | `/api/admin/passwords/bulk-import?preview=true`                                      | XLS'i parse et, dönüş: doğrulama sonucu. Yazma yok.                                                   |
| POST   | `/api/admin/passwords/bulk-import`                                                   | XLS'i işle, kullanıcıları `isActive:false` oluştur, şifreler üret, `credentialsFile` + `batchId` dön. |
| POST   | `/api/admin/passwords/activate-batch`                                                | `{ batchId }` al, o batch'teki kullanıcıları `isActive:true` yap.                                     |
| POST   | `/api/admin/passwords/batch/:batchId/regenerate`                                     | Pending batch için tüm şifreleri yeniden üret, yeni credentials XLSX dön.                             |
| DELETE | `/api/admin/passwords/batch/:batchId`                                                | Pending batch'i iptal et (kullanıcıları sil).                                                         |
| GET    | `/api/admin/passwords/batches?status=pending`                                        | Bekleyen batch'leri listele.                                                                          |
| POST   | `/api/admin/passwords/reset/:userId`                                                 | Body: `{ reason, reasonNote? }`. Yeni şifre üret, dön (tek sefer). `tokenVersion` arttırılır.         |
| POST   | `/api/admin/passwords/generate/:userId`                                              | `passwordLastSetAt == null` olan kullanıcılar için. Aynı response. Tekrar çağrılırsa 409.             |
| GET    | `/api/admin/passwords/audit?page=&limit=&action=&adminId=&userId=&from=&to=&reason=` | Audit log, sayfalı.                                                                                   |

Plaintext şifre içeren response'lar: `Cache-Control: no-store, no-cache, must-revalidate`, `Pragma: no-cache`.

### Şifre üretimi

- **Uzunluk:** 8 karakter
- **Alfabe:** `ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789` (kafa karıştırıcı `0 O o 1 l I` çıkarıldı)
- **Entropi:** `log2(55^8) ≈ 46.2 bit` — okul içi admin-reset flow'u için yeterli; ilk-giriş niyetli kullanım.
- **Kaynak:** `crypto.randomBytes(16)` → alfabe uzunluğuna modulo ile map (modulo bias önlemek için rejection sampling).
- Üretim fonksiyonu saf (pure), deterministik değil, dış bağımlılık yok.

### Tofaş sınıf listesi parser

Input: ham XLS buffer.
Algoritma:

1. İlk sheet'i oku, `{header: 1, defval: ''}` ile satır dizisine çevir.
2. Satırları sırayla gez:
   - `String(row[0])` "Sınıf Listesi" içeriyorsa yeni bir blok: regex `(\d+)\.\s*Sınıf\s*\/\s*([A-F])` ile `{sinif, sube}` yakala.
   - Aktif blok varken `typeof row[0] === 'number'` ise öğrenci satırı:
     - `id = String(row[1]).trim()`
     - `adSoyad = (String(row[3]).trim() + ' ' + String(row[7]).trim()).replace(/\s+/g, ' ')`
     - `rol = 'student'`
     - `sinif`, `sube` aktif bloktan
     - `pansiyon = String(row[13]).trim() === 'Yatılı'`
3. Doğrulama: duplicate ID, boş ad/soyad, beklenmeyen sınıf/şube değerleri.

Bu parser `parseUserFile`'dan ayrı bir fonksiyon: `parseClassListFile(buffer)`. Mevcut `parseUserFile` (düz tablo) dokunulmaz ama çağıran sayfa ([`BulkUserImportSection.tsx`](../../client/src/pages/Dashboard/BulkUserImportSection.tsx)) yeni sayfayla değiştirileceği için çağrısı kesilir.

### Credentials XLSX içeriği

Tek sheet, başlıklar:

```
Öğrenci No | Ad Soyad | Rol | Sınıf | Şube | Pansiyon | Şifre
```

Stil: başlık satırı bold + arka plan, rakamlar text formatta. Dosya adı: `credentials-<YYYYMMDD>-<batchId>.xlsx`.

### Frontend dosya yapısı

```
client/src/pages/Dashboard/PasswordManagement/
├── PasswordManagementPage.tsx      # Container, tab yönetimi
├── BulkImportTab.tsx               # XLS upload + preview + import + download + pending batches
├── UsersTab.tsx                    # User list + filters + reset/generate actions
├── AuditLogTab.tsx                 # History view
├── PasswordRevealModal.tsx         # Tek sefer göster + kopyala + kapat (paylaşılan)
├── ResetReasonModal.tsx            # Reset öncesi reason dropdown (paylaşılan)
└── hooks/
    ├── useBulkImport.ts            # TanStack Query mutations
    ├── useUserPasswordActions.ts
    └── useAuditLog.ts
```

Admin yan menüsünden `/yonetici/sifre-yonetimi` olarak erişilir.

**Silinenler:**

- `client/src/pages/Dashboard/BulkUserImportSection.tsx` (yeni sayfa devralır)
- Admin dashboard'daki "Toplu Kullanıcı İçe Aktar" menü öğesi
- `UserService.bulkImportUsers` API client metodu
- `POST /api/users/bulk-import` backend rotası
- `server/src/services/bulkImportService.ts` içinden `parseUserFile`, `validateUserRows`, `bulkCreateUsers` export'ları

**Korunanlar:**

- `parseParentChildFile` ve `bulkLinkParentChild` (veli-öğrenci eşleştirmesi için, ayrı bir admin akışında kullanılıyor)
- Mevcut tekil "Kullanıcı Ekle" formu — yalnızca "Şifreyi otomatik üret" checkbox eklenecek.

## Güvenlik Modeli

- Plaintext şifre hiçbir zaman:
  - Winston log'una (özel redaction middleware),
  - Redis cache'ine,
  - Sentry breadcrumb'ına,
  - Audit log'a,
  - Diske (credentials XLSX streamed, `fs.writeFile` yok)
    yazılmaz.
- Audit log kaydı şifre hash'lenmeden **önce** oluşturulur; sonraki adımlar fail olursa bile trail kalır.
- Plaintext içeren her response'a `no-store` cache header'ı.
- Admin reset'i yapılan kullanıcının `tokenVersion` arttırılır → mevcut JWT session'ları anında geçersiz.
- `PasswordRevealModal` unmount'ta plaintext state'i temizler (`useEffect` cleanup).
- XLS upload: mevcut `verifyUploadedFiles` middleware (magic byte kontrolü + 5MB limit) korunur.
- Tüm rotalar mevcut `rateLimiter` ve `auditLog` middleware'lerinden geçer; `auditLog` middleware'ine plaintext redaction eklenir.
- Reason dropdown client-side validation + server-side whitelist (`VALID_REASONS` enum). `reasonNote` 280 char limit, XSS sanitization.

## Veri akışı örnekleri

### Toplu import

```
Admin            Client                Server             DB
  │                │                     │                 │
  │─ XLS upload ──▶│                     │                 │
  │                │─ POST ?preview=true ▶                 │
  │                │                     │─ parse, validate│
  │                │◀─ preview + errors ─│                 │
  │◀─ onay ekranı ─│                     │                 │
  │─ "İçe aktar" ─▶│                     │                 │
  │                │─ POST bulk-import ──▶                 │
  │                │                     │─ generate 444 pw│
  │                │                     │─ hash + insert ─▶ users (isActive:false)
  │                │                     │─ audit log x444 ▶ PasswordAuditLog
  │                │                     │─ batch record ──▶ PasswordImportBatch
  │                │                     │─ build XLSX ────│
  │                │◀ base64 xlsx + id ──│                 │
  │◀─ indir butonu│                     │                 │
  │─ "Aktif et" ──▶│                     │                 │
  │                │─ POST activate ─────▶                 │
  │                │                     │─ update isActive▶ users (isActive:true)
  │                │◀──── OK ────────────│                 │
```

### Tekli reset

```
Admin → "Şifre Sıfırla" → reason modal → onay
       → POST /api/admin/passwords/reset/:userId
         → audit log yazılır (plaintext yok)
         → yeni şifre üretilir
         → hash'lenir, user.sifre güncellenir
         → tokenVersion++ → mevcut oturumlar geçersiz
         → response: { password: "xxxxxxxx" }
       → PasswordRevealModal açılır → admin kopyalar → kapat
```

## Test Stratejisi

**Unit:**

- `passwordGenerator.ts`: uzunluk, karakter setine uyum, 10k çağrıda çakışma yok, rejection-sampling modulo bias testi.
- `classListParser.ts`: gerçek XLS fixture ile 444 öğrenci parse, 16 sınıf algılama, hatalı bloklarda uyumlu davranış.
- `credentialsExporter.ts`: XLSX bytes üretilir, header satırı doğru, rol/sınıf mapping doğru.
- `passwordAuditService.ts`: plaintext şifre parametresi **asla kabul edilmez** (compile-time + runtime assertion).

**Integration:**

- Bulk import → 444 user inactive → activate → inactive count = 0.
- Reset flow: eski token geçersiz, yeni şifre ile login başarılı.
- Yetki: admin dışı rol bu rotalara 403.
- Rate limit: 100 req/dk aşımında 429.

**Security:**

- Winston transport'una plaintext şifre göndermeye çalışan regression test.
- Response body'de ve header'larda plaintext şifre sadece beklenen endpoint'lerde mevcut.

**E2E (Playwright):**

- Admin XLS yükler, preview görür, import eder, credentials indirir, aktif eder, öğrenci hesabıyla login olur.

Hedefler: server %80 coverage eşiği (mevcut), client %70 (mevcut).

## Migration Plan

1. **Backend şema:** `PasswordAuditLog` ve `PasswordImportBatch` modelleri eklenir. `User` şemasına `passwordLastSetAt` + `importBatchId` eklenir. `migrate:up` ile idempotent migration; mevcut 0 kayıt etkilenmez (yeni alanlar opsiyonel).
2. **Backend modül:** `server/src/modules/passwordAdmin/` mount edilir, rotalar açılır. `bulkImportService.ts`'ten `parseUserFile`, `validateUserRows`, `bulkCreateUsers` export'ları kaldırılır (`parseParentChildFile`, `bulkLinkParentChild` kalır).
3. **Frontend:** Yeni sayfa ve bileşenler eklenir. Tekil kullanıcı oluşturma formuna "Şifreyi otomatik üret" checkbox'ı eklenir.
4. **Eski kodun kaldırılması:** `BulkUserImportSection.tsx`, `UserService.bulkImportUsers`, `POST /api/users/bulk-import` silinir. Admin dashboard menüsünden "Toplu Kullanıcı İçe Aktar" kaldırılır, yerine "Şifre Yönetimi" eklenir.
5. **İlk import:** 444 öğrencilik Tofaş sınıf listesi admin tarafından yeni sayfadan yüklenir → batch `pending` oluşur → credentials XLSX indirilir → batch aktif edilir → öğrenciler login olabilir.

## Açık Riskler

- Kurumsal ağda HTTP(S) log'larında response body'nin kaydedilmediği varsayımı. Nginx access log'unda body'nin kaydedilmediği doğrulanmalı (tipik default — sadece status ve size loglanır, body değil).
- Admin credentials XLSX'i indirdikten sonra nasıl muhafaza ettiği bu sistemin kontrolü dışında. Dokümantasyonla (admin kullanım kılavuzu) "bu dosyayı dağıtım sonrası silin" uyarısı eklenmeli.
- İlk 444 öğrenci import edildikten sonra admin credentials'ı dağıtmazsa öğrenciler login olamaz. Admin UI'da "X öğrenci hâlâ aktivasyon bekliyor" uyarısı gösterilir.

## Sonraki Adım

Bu spec onaylandığında `writing-plans` skill'i ile adım adım implementation planı yazılır (`docs/superpowers/plans/2026-04-20-password-management-plan.md`).
