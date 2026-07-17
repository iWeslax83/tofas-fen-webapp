# Tofaş Fen Webapp

Tofaş Fen Lisesi Bilgi Yönetim Sistemi. Not, ödev, ders programı, iletişim, pansiyon ve idari iş akışlarını tek bir yerde toplayan Türkçe okul platformu.

React 19 + Express 4 + MongoDB üzerine kurulu, npm workspaces ve Turbo ile yönetilen bir monorepo.

## İçindekiler

- [Modüller](#modüller)
- [Roller](#roller)
- [Depo yapısı](#depo-yapısı)
- [Teknolojiler](#teknolojiler)
- [Kurulum](#kurulum)
- [Komutlar](#komutlar)
- [Ortam değişkenleri](#ortam-değişkenleri)
- [Testler](#testler)
- [Deployment](#deployment)
- [Dokümantasyon](#dokümantasyon)
- [Katkıda bulunma](#katkıda-bulunma)

## Modüller

Notlar, Performans, Ödevler, İletişim, Evci İzin Talepleri, Takvim, Duyurular, Bildirimler, Randevular, Dilekçeler, Yemek Listesi, Belletmen Listesi, Pansiyon.

## Roller

Dört rol ve rol bazlı erişim denetimi: **Öğrenci**, **Öğretmen**, **Veli**, **Yönetici**. Erişim, sunucu tarafında `auth.ts` middleware'i ile birlikte `ownershipCheck` ve `parentChildAccess` kontrolleriyle uygulanır.

## Depo yapısı

```
client/    React 19 + Vite 6 + TypeScript arayüz
server/    Express 4 + TypeScript + Mongoose API
shared/    Ortak TypeScript tipleri ve DTO'lar
docs/      Proje dokümantasyonu
k8s/       Kubernetes production manifestleri
nginx/     Reverse proxy yapılandırması
scripts/   Secret üretimi, deploy, SSL, seed yardımcıları
```

Turbo paketler arası görevleri önbellekle çalıştırır. `build`, `lint`, `type-check` ve `test` önbelleklenir; `dev` ve `lint:fix` önbelleklenmez.

## Teknolojiler

### Frontend (`client/`)

- **React 19** + **TypeScript**, **Vite 6** ile derlenir
- **React Router 7** yönlendirme
- **Zustand** (istemci state) + **TanStack Query v5** (sunucu state)
- **Tailwind CSS 4** (özel Tofaş renkleri), **Radix UI**, **Headless UI**
- **Recharts** grafikler, **Framer Motion** animasyonlar
- **IBM Plex** (Sans / Serif / Mono) tipografi
- **Axios** tabanlı API istemcisi (`src/utils/apiService.ts`)
- **Sentry** + **OpenTelemetry** izleme
- Service worker ile PWA / offline desteği (yalnızca production build'de kayıtlanır)

### Backend (`server/`)

- **Express 4** + **TypeScript**, **Mongoose** ODM ile **MongoDB**
- **Redis**: oturum, rate limiting ve yanıt önbelleği
- **Apollo Server** ile GraphQL (DataLoader, complexity/depth sınırı)
- **JWT** access + refresh token, **bcryptjs** parola hash'leme
- Middleware zinciri: Helmet → CORS → rate limiting → WAF → CAPTCHA → JWT auth → API versiyonlama → audit log → cache → validation → error handler
- **ExcelJS** (tablo), **PDFKit** (PDF), **Sharp** (görsel) dışa aktarım
- **web-push** (VAPID) push bildirimleri, **Nodemailer** e-posta
- **node-cron** zamanlanmış görevler, **Winston** günlük rotasyonlu loglama

### DevOps

Docker (multi-stage), Kubernetes, Nginx, GitHub Actions, Vitest, Playwright.

## Kurulum

### Gereksinimler

- **Node.js 22+** (CI 22 ile çalışır, Docker imajları Node 26 tabanlıdır)
- **npm 11+** (monorepo npm workspaces kullanır)
- **Docker + Docker Compose** (MongoDB ve Redis için)

### Geliştirme ortamı

Bu bir monorepo — bağımlılıkları kökten bir kez kurun, alt klasörlerde ayrı ayrı `npm install` çalıştırmayın.

```bash
# 1. Depoyu klonlayın
git clone https://github.com/iWeslax83/tofas-fen-webapp.git
cd tofas-fen-webapp

# 2. Tüm workspace bağımlılıklarını kurun
npm install

# 3. MongoDB ve Redis'i başlatın
docker-compose up -d mongodb redis

# 4. Ortam değişkenlerini hazırlayın
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run generate-secrets        # JWT_SECRET / JWT_REFRESH_SECRET üretir

# 5. Veritabanını hazırlayın
cd server && npm run create-indexes && npm run migrate:up && cd ..
npm run seed                    # test verisi (opsiyonel)

# 6. İstemci ve sunucuyu birlikte başlatın
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Docker ile tüm yığın

```bash
docker-compose up -d                              # mongodb, redis, backend, frontend
docker-compose --profile production up -d         # + nginx (TLS termination)
```

Docker'da frontend Nginx arkasında **3000** portundan servis edilir (dev'deki 5173 değil).

## Komutlar

Tüm komutlar depo kökünden çalıştırılır.

```bash
npm run dev                 # client (5173) + server (3001)
npm run dev:client          # yalnızca frontend
npm run dev:server          # yalnızca backend

npm run build               # her iki paketi Turbo ile derle
npm run lint                # ESLint
npm run lint:fix            # otomatik düzeltme
npm run type-check          # TypeScript kontrolü
npm run format              # Prettier

npm run seed                # veritabanına test verisi yükle
npm run docker:up           # docker-compose up -d
npm run k8s:status          # production pod durumu
npm run generate-secrets    # production secret'ları üret
```

Veritabanı yönetimi `server/` içinden:

```bash
cd server
npm run create-indexes      # MongoDB indekslerini oluştur
npm run migrate:up          # bekleyen migration'ları uygula
npm run migrate:down        # son migration'ı geri al
npm run create-admin        # yönetici hesabı oluştur
npm run generate:openapi    # OpenAPI spec üret
```

## Ortam değişkenleri

### Backend (`server/.env`)

`server/.env.example` dosyasını kopyalayın. Zorunlu ve sık kullanılan değişkenler:

| Değişken                                 | Açıklama                                                              |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `MONGODB_URI`                            | MongoDB bağlantısı (varsayılan `mongodb://localhost:27017/tofas-fen`) |
| `REDIS_HOST` / `REDIS_PORT`              | Redis; oturum, rate limit ve cache için gerekli                       |
| `JWT_SECRET` / `JWT_REFRESH_SECRET`      | Token imzalama anahtarları (`npm run generate-secrets`)               |
| `FRONTEND_URL`                           | CORS origin (varsayılan `http://localhost:5173`)                      |
| `BACKEND_URL`                            | API'nin kendi genel adresi                                            |
| `COOKIE_SAMESITE`                        | Frontend ve API farklı origin'lerdeyse `none` olmalı                  |
| `SMTP_*`                                 | Nodemailer e-posta ayarları                                           |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web push bildirimleri                                                 |
| `BCRYPT_ROUNDS`                          | Parola hash maliyeti                                                  |
| `RATE_LIMIT_*`, `AUTH_RATE_LIMIT_*`      | Rate limit pencereleri ve limitleri                                   |

### Frontend (`client/.env`)

> **Dikkat:** `VITE_*` değişkenleri **build zamanında** bundle'a gömülür. Çalışan bir konteynerde veya sunucuda ayarlamak hiçbir şey değiştirmez — CI, Vercel proje ayarları veya Docker `ARG` içinde tanımlanmaları gerekir. Hiçbir zaman `VITE_*` içine secret koymayın; devtools açan herkes okuyabilir.

| Değişken          | Açıklama                                                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`    | Backend API adresi. **Production build'de zorunlu** — eksikse uygulama boot'ta patlar ve tamamen boş bir sayfa render eder. |
| `VITE_SENTRY_DSN` | Frontend hata takibi (opsiyonel)                                                                                            |

## Testler

```bash
npm run test                # tüm testler
npm run test:client         # frontend (Vitest + JSDOM), %70 coverage eşiği
npm run test:server         # backend (Vitest + Node), %80 coverage eşiği
npm run test:integration    # backend entegrasyon testleri
npm run test:e2e            # Playwright E2E
npm run test:coverage       # coverage raporları

# tek bir dosya
cd server && npx vitest run src/path/to/file.test.ts
```

Backend testleri `src/test/` altında `unit/`, `integration/`, `security/`, `performance/`, `models/`, `modules/`, `routes/` olarak gruplanmıştır. `npm run test:security` ve `npm run test:performance` ile ayrı ayrı çalıştırılabilir.

## Deployment

Üç yol destekleniyor:

**1. Vercel (frontend) + container host (backend)** — en hızlısı. Kök dizindeki `vercel.json` istemciyi `client/dist`'ten servis eder. Backend, veritabanı ve cache yönetilen servislerde çalışır. Adım adım: [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md).

**2. Docker Compose (tek sunucu)**

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**3. Kubernetes**

```bash
npm run generate-secrets
# k8s/production/ altındaki secret ve configmap'leri güncelleyin
npm run k8s:apply
npm run k8s:status
```

Hangi yolu seçerseniz seçin, deploy bittiğinde veritabanı boştur — indeks, migration ve hesap yoktur, yani henüz kimse giriş yapamaz. Oradan çalışan bir girişe kadar olan adımlar: [docs/GO_LIVE.md](docs/GO_LIVE.md).

### CI/CD

GitHub Actions (`.github/workflows/ci.yml`): secret taraması (Gitleaks), OpenAPI kontrat doğrulaması, lint, type-check, test, build ve Docker imaj derlemesi.

## Dokümantasyon

| Doküman                                                   | İçerik                                                         |
| --------------------------------------------------------- | -------------------------------------------------------------- |
| [GO_LIVE.md](docs/GO_LIVE.md)                             | Deploy sonrası: indeksler, migration'lar, ilk hesap, ilk giriş |
| [DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md)                 | Vercel + yönetilen servislerle yayına alma                     |
| [PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md) | Kendi sunucunuzda production deployment                        |
| [DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)             | Geliştirici rehberi                                            |
| [USER_GUIDE.md](docs/USER_GUIDE.md)                       | Son kullanıcı kılavuzu (Türkçe)                                |
| [API_CONTRACTS.md](docs/API_CONTRACTS.md)                 | API kontratları ve versiyonlama                                |
| [SECURITY.md](docs/SECURITY.md)                           | Güvenlik notları                                               |
| [SSL_SETUP.md](docs/SSL_SETUP.md)                         | TLS sertifikası kurulumu                                       |

## Katkıda bulunma

Commit'ler öncesi Husky + lint-staged, değişen `.ts`/`.tsx` dosyalarında Prettier ve ESLint çalıştırır.

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/ozellik-adi`)
3. Commit edin
4. Push edin ve Pull Request açın

## Lisans

MIT. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## İletişim

- **E-posta**: emirsakarya00@gmail.com
- **GitHub**: [@iWeslax83](https://github.com/iWeslax83)
