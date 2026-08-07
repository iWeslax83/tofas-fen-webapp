# Gemini Destekli Öğrenci İçe Aktarma

Tarih: 2026-07-22
Durum: Tasarım onaylandı, uygulama planı bekliyor
Bağımlılık: `2026-07-22-ogretim-yili-gecisi-design.md` önce uygulanır (aynı UI sayfasına dokunur).

## Problem

Yeni kayıt olan 9. sınıf öğrencilerinin listesi her yıl farklı bir düzende geliyor: kolon
sırası, başlık isimleri, birleşik ya da ayrı ad/soyad, tek blok ya da sınıf başlıklı çok
bloklu sayfa. Mevcut `classListParser.ts` sabit kolon indekslerine (`COL_AD = 3`,
`COL_SOYAD = 7`, `COL_PANSIYON = 13`) bağlı; sadece e-Okul'un Tofaş sınıf listesi çıktısını
okuyabiliyor. Başka düzende bir dosya sessizce 0 satır üretiyor.

## Kapsam

Bilinmeyen düzendeki bir Excel dosyasının kolon yapısını Gemini'ye çözdürüp, satırları
**lokal olarak** ayrıştırmak. Mevcut içe aktarma akışına fallback olarak eklenir.

### Kapsam dışı

- Veli hesabı oluşturma — veli eşleştirme zaten ayrı bir akış
  (`bulkImportService.bulkLinkParentChild`)
- Dosyanın tamamını Gemini'ye gönderme
- Gemini'nin varsayılan ayrıştırma yolu olması
- Mevcut `classListParser.ts`'in değiştirilmesi veya kaldırılması

## Kararlar

| Konu                  | Karar                                                     |
| --------------------- | --------------------------------------------------------- |
| Gemini'ye giden veri  | Yalnızca yapı: ilk 15 satır, kişisel veri maskelenmiş     |
| Gemini'nin döndürdüğü | Kolon eşleme planı (JSON). Satır verisi değil.            |
| Regex                 | Gemini'den regex kabul edilmez                            |
| Entegrasyon           | Mevcut `/bulk-import` içinde fallback                     |
| Öğrenci ID            | Excel'deki öğrenci numarası; kolon yoksa satır reddedilir |
| Sınıf                 | Dosyada kolon yoksa admin'in girdiği `defaultSinif`       |

## Neden yalnızca yapı gönderiliyor

Dosyanın tamamını göndermek her öğrencinin adı, TCKN'si ve veli telefonunun Google'a
gitmesi demek. Projede KVKK onay modeli (`KvkkConsent`) ve `tckn` alanı için at-rest
şifreleme var; bu veriyi üçüncü tarafa göndermek mevcut güvenlik duruşuyla çelişir.
Yapı gönderme yaklaşımı ayrıca:

- 500 satırda isim/numara halüsinasyonunu yapısal olarak imkânsız kılar (satır verisi
  hiç modele girmez)
- Token maliyetini ve gecikmeyi sabit tutar (dosya boyutundan bağımsız)
- Ayrıştırmayı deterministik ve ağsız test edilebilir bırakır

## Mimari

### Akış

`passwordAdminService.bulkImportClassList` içinde:

```
1. rows = parseClassListFile(buffer)            // mevcut sabit Tofaş parser
2. if (rows.length === 0 && isGeminiEnabled()) {
     plan = await getMappingPlan(buffer)        // Gemini — sadece yapı
     rows = applyMappingPlan(buffer, plan, { defaultSinif })   // lokal, ağ yok
     warnings.push('Dosya düzeni otomatik tanındı (Gemini)')
   }
3. // buradan sonrası aynen mevcut akış:
   //   batch oluştur -> User.insertMany(isActive: false)
   //   -> credentials.xlsx -> activate-batch / cancel
```

Bilinen Tofaş formatında Gemini'ye hiç çağrı yapılmaz. Önizleme/onay kapısı yeniden icat
edilmez: mevcut akış zaten kullanıcıları `isActive: false` olarak yazıp `pending` batch
üretiyor, admin `activate-batch` ile onaylıyor veya `DELETE /batch/:id` ile iptal edip
kayıtları siliyor.

### Yeni dosyalar

`server/src/modules/passwordAdmin/` altında:

```
geminiColumnMapper.ts    # Gemini çağrısı + maskeleme + plan doğrulama
mappingPlanParser.ts     # applyMappingPlan — saf fonksiyon, ağ yok
__tests__/geminiColumnMapper.test.ts
__tests__/mappingPlanParser.test.ts
```

Yeni modül klasörü açılmaz; iş mevcut `passwordAdmin` modülünün sorumluluğu içinde.

### `MappingPlan` sözleşmesi

```ts
export interface MappingPlan {
  headerRowIndex: number;
  layout: 'flat' | 'blocked';
  /** blocked ise: sınıf başlığının bulunduğu kolon indeksi */
  classHeaderColumn?: number;
  columns: {
    ogrenciNo: number; // zorunlu
    adSoyad?: number; // ya bu
    ad?: number; // ya da ad + soyad
    soyad?: number;
    sinif?: number;
    sube?: number;
    pansiyon?: number;
  };
  /** pansiyon kolonundaki "yatılı" anlamına gelen değer, ör. "Yatılı" */
  pansiyonTrueValue?: string;
}
```

`blocked` düzen, mevcut Tofaş dosyalarındaki gibi araya `"FL - 9. Sınıf / A Şubesi ... Sınıf
Listesi"` başlık satırları serpiştirilmiş sayfa demektir.

### Gemini'den regex alınmaz

`blocked` düzende sınıf başlığı satırı, `classListParser.ts` içinde zaten tanımlı olan sabit
`CLASS_HEADER_RE = /(\d+)\.\s*Sınıf\s*\/\s*([A-F])/` ile çözülür. Gemini yalnızca bu
başlığın **hangi kolonda** olduğunu söyler.

Model üretimi bir regex'i `RegExp` ile derleyip çalıştırmak ReDoS açığıdır: LLM'e prompt
enjeksiyonuyla katastrofik geri izleme yaptıran bir desen ürettirmek mümkündür ve sunucu
kilitlenir. Plan şemasında regex alanı bulunmaz.

### Maskeleme

`maskSampleRows(rows: unknown[][]): unknown[][]` — Gemini'ye giden örnek satırlarda:

Kurallar **sırayla** uygulanır, ilk eşleşen kazanır:

| #   | Desen                                                      | Yerine                  |
| --- | ---------------------------------------------------------- | ----------------------- |
| 1   | `0` veya `5` ile başlayan 10–11 haneli sayı                | `TEL`                   |
| 2   | `0` ile başlamayan 11 haneli sayı                          | `TCKN`                  |
| 3   | E-posta deseni                                             | `EPOSTA`                |
| 4   | Örneklem içinde **birden fazla satırda tekrar eden** metin | _olduğu gibi bırakılır_ |
| 5   | Kalan metin hücreleri                                      | `METIN`                 |

Sıra önemli: TCKN `0` ile başlamaz, telefon numarası başlar. TCKN kuralı önce gelirse
`05321234567` yanlışlıkla `TCKN` olarak maskelenir — sonuç güvenlik açısından zararsız ama
kural takibi bozulur, bu yüzden telefon önce sınanır.

4. kural şart: örneklemde tekrar eden kısa metinler kategorik değerlerdir (`Yatılı`,
   `Gündüzlü`, `Kız`, `Erkek`, `A`, `B`). Bunlar kimlik belirtmez ve `pansiyonTrueValue` ile
   `sube` kolonunun tespiti tamamen bunlara dayanır. Her metni maskelemek modelin bu iki
   kolonu bulmasını imkânsız kılardı. Kişi adları örneklemde tekrar etmediği için 5. kurala
   düşer ve maskelenir.

Kolon **sayısı, sırası ve hücrelerin dolu/boş olması** korunur. Başlık satırı maskelenmez
(kolon adları eşlemenin ana sinyali ve kişisel veri içermez).

En fazla 15 satır × 30 kolon gönderilir.

### Gemini çağrısı

- Paket: `@google/genai`
- Model: `gemini-2.5-flash`
- Structured output: `responseSchema` ile `MappingPlan` şeması zorlanır
- `temperature: 0`
- Timeout 20 sn, tek deneme, retry yok
- Ortam değişkeni: `GEMINI_API_KEY`. Yoksa `isGeminiEnabled()` `false` döner, fallback hiç
  denenmez, mevcut davranış aynen korunur.

Prompt, dosyanın 2 boyutlu hücre matrisini (maskelenmiş) ve kolon indekslerini verir;
modelden sadece plan JSON'u ister.

### Plan doğrulama (zorunlu)

`applyMappingPlan` çağrılmadan önce `validateMappingPlan(plan, sheetWidth, sheetHeight)`:

- `headerRowIndex` sayfa yüksekliği içinde
- Tüm kolon indeksleri `0 <= i < sheetWidth`
- `columns.ogrenciNo` mevcut
- `columns.adSoyad` **veya** (`columns.ad` **ve** `columns.soyad`) mevcut
- `layout === 'blocked'` ise `classHeaderColumn` mevcut ve aralık içinde

Doğrulama başarısızsa plan tümden reddedilir ve admin'e "dosya düzeni tanınamadı" hatası
döner. Kısmen uygulanmış veya uydurulmuş bir plan asla batch'e veri yazamaz.

### `applyMappingPlan` — saf fonksiyon

Girdi: workbook buffer + doğrulanmış plan + `{ defaultSinif?: string }`.
Çıktı: mevcut `ParsedStudentRow[]` (`{ id, adSoyad, rol, sinif, sube, pansiyon }`) +
`warnings: string[]`.

Davranış `classListParser` ile aynı sözleşmeye uyar:

- `MAX_IMPORT_ROWS = 500` sınırı korunur, aşım uyarı olarak raporlanır
- `ogrenciNo` boş satırlar atlanır
- ad/soyad boş satırlar uyarıyla atlanır
- `sinif` kolonu yoksa `defaultSinif`; o da yoksa satır uyarıyla reddedilir
- `sube` kolonu yoksa alan boş bırakılır (`User.sube` opsiyonel)
- `pansiyon` kolonu yoksa `false`

Bu fonksiyon ağa çıkmaz ve tamamen fixture'larla test edilir.

### Önbellek

Redis: anahtar = başlık satırlarının SHA-256 hash'i, değer = doğrulanmış plan, TTL 30 gün.
Aynı formatın ikinci yüklemesi Gemini'ye gitmez. Redis kapalıysa önbellek atlanır, akış
çalışmaya devam eder.

### `defaultSinif` — LLM'e tahmin ettirilmez

Yükleme formuna opsiyonel alan: "Bu dosyadaki öğrencilerin sınıfı". Yeni kayıt listelerinde
sınıf bilgisi çoğunlukla dosyada hiç yazmaz (herkes 9'dur, yazmaya gerek görülmez).
Bunu modele tahmin ettirmek yerine admin açıkça belirtir.

Sunucu tarafı doğrulama: `'9' | '10' | '11' | '12'` dışındaki değer 400 döner.
`multipart/form-data` içinde `defaultSinif` alanı olarak gelir.

## API değişikliği

Yeni endpoint yok. `POST /bulk-import` iki noktada değişir:

- İstek gövdesine opsiyonel `defaultSinif` alanı eklenir
- Yanıttaki `warnings` dizisi Gemini yolu kullanıldığında bunu belirtir

Rate limit (`importLimiter`, 60 sn / 20 istek) ve `verifyUploadedFiles` magic-byte kontrolü
aynen geçerli.

## İstemci

Senkronizasyon sayfasındaki mevcut yükleme alanına:

- "Bu dosyadaki öğrencilerin sınıfı" seçici (opsiyonel, 9/10/11/12)
- Yanıttaki `warnings` zaten gösteriliyor; "otomatik tanındı" uyarısı buradan görünür
- Format tanınamadığında net hata mesajı

Yeni sayfa veya ikinci yükleme butonu eklenmez.

## Kod dışı bağımlılıklar

- `@google/genai` bağımlılığı `server/package.json` **ve** `server/package-lock.json`'a
  eklenir. Server'ın Docker `npm ci` adımı kendi lock dosyasını kullanır; kök dizinden
  `npm install` bunu güncellemez, izole olarak yeniden üretilmelidir.
- `dependency-review` CI işi sert kapıdır (`fail-on-severity=low`). Yeni bağımlılık flag
  yerse tam GHSA numarasıyla allowlist gerekir.
- `GEMINI_API_KEY`: `server/.env.example` ve `k8s/production/` secret manifestine eklenir.
  Gitleaks taraması aktif — gerçek anahtar hiçbir dosyaya yazılmaz.

## Hata durumları

| Durum                          | Davranış                                                  |
| ------------------------------ | --------------------------------------------------------- |
| `GEMINI_API_KEY` yok           | Fallback hiç denenmez, mevcut davranış korunur            |
| Gemini timeout / ağ hatası     | `IMPORT_FORMAT_UNRECOGNIZED`, "otomatik tanıma başarısız" |
| Plan doğrulamayı geçemez       | Plan reddedilir, aynı hata; hiçbir kayıt yazılmaz         |
| Plan geçerli ama 0 satır çıkar | `EMPTY_IMPORT` (mevcut hata kodu)                         |
| Redis kapalı                   | Önbellek atlanır, çağrı yapılır                           |
| 500 satır aşımı                | Mevcut davranış: 500'e kesilir + uyarı                    |

## Test planı

**`mappingPlanParser` (ağsız, fixture bazlı)**

- `flat` düzen, birleşik `adSoyad` kolonu
- `flat` düzen, ayrı `ad` + `soyad`
- `blocked` düzen, sınıf başlıklarından `sinif`/`sube` çıkarımı
- `sinif` kolonu yok + `defaultSinif` verildi → tüm satırlar o sınıfa
- `sinif` kolonu yok + `defaultSinif` yok → satırlar uyarıyla reddedilir
- 501 satır → 500'e kesilir, uyarı üretilir
- `ogrenciNo` boş satırlar atlanır

**`validateMappingPlan`**

- Aralık dışı kolon indeksi reddedilir
- `ogrenciNo` eksik reddedilir
- Ne `adSoyad` ne `ad`+`soyad` → reddedilir
- `blocked` + `classHeaderColumn` yok → reddedilir

**`maskSampleRows`**

- 11 haneli sayı `TCKN` olur
- `05321234567` `TEL` olur, `TCKN` olmaz (kural sırası)
- Tekrar etmeyen isim hücresi `METIN` olur
- Örneklemde tekrar eden `Yatılı` / `Gündüzlü` olduğu gibi kalır
- Kolon sayısı ve sırası korunur
- **TCKN'nin oluşturulan prompt metnine sızmadığını doğrulayan açık test**

**Entegrasyon (Gemini mock)**

- Tofaş formatı: `parseClassListFile` satır üretir, Gemini **çağrılmaz** (mock çağrı sayacı 0)
- Bilinmeyen format: Gemini mock plan döner, satırlar üretilir, batch oluşur
- Gemini hata fırlatır: `IMPORT_FORMAT_UNRECOGNIZED`, veritabanına yazma yok

Gerçek Gemini API'sine giden test yazılmaz.

## Uygulama sırası

1. `mappingPlanParser.ts` + `validateMappingPlan` + testleri (ağ yok, Gemini yok)
2. `maskSampleRows` + testleri
3. `@google/genai` bağımlılığı + `server/package-lock.json` izole yeniden üretimi
4. `geminiColumnMapper.ts` — çağrı, önbellek, `isGeminiEnabled()`
5. `bulkImportClassList` fallback dalı + `defaultSinif` geçişi
6. Rota/validator `defaultSinif` doğrulaması
7. `.env.example` ve k8s secret
8. İstemci sınıf seçici
