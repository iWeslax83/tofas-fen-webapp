# Yükleme Ekranı Yeniden Tasarımı

## Amaç

Suspense fallback olarak kullanılan `LoadingSpinner` bileşeni (`client/src/routes/AppRoutes.tsx`) şu an düz gri çember + metin. Marka kimliğini yansıtan, daha profesyonel bir yükleme ekranına dönüştürülecek.

## Kapsam

- `client/src/routes/AppRoutes.tsx`: `LoadingSpinner` bileşeni
- `client/src/styles/theme.css`: `.loading-container`, `.loading-spinner` ve ilgili kurallar (satır ~1176-1225)

## Tasarım

- **Logo**: `client/public/tofaslogo.png`, ortada, sabit ~64px boyut. Hafif nabız animasyonu (scale 0.96↔1.04, ~2s ease-in-out infinite).
- **İlerleme göstergesi**: Logonun altında ince (2-3px), 160px genişliğinde, teal (`--primary-red`, #0f766e) renkli indeterminate kayan progress bar. Spinner (dönen çember) kaldırılıyor, yerine bu geliyor.
- **Metin**: Mevcut davranış korunuyor — varsayılan `Yükleniyor...`, `useDelayedFlag(6000)` sonrası (server uyanma senaryosu) `slowMessage` prop'u ile değişen mesaj.
- **Arka plan/düzen**: Mevcut `--gray-50` düz renk, `min-height: 100vh`, flex ile ortalanmış düzen korunuyor.
- **Dark mode**: Mevcut `--gray-*` / `--primary-red` dark mode token override'ları zaten var, otomatik uyum sağlanacak.

## Kapsam dışı

- Skeleton içerik önizlemesi yok
- Pill/badge, gradient, glassmorphism yok (global tasarım kuralları)
- `useDelayedFlag` / slow-message mantığında değişiklik yok

## Test

- Görsel doğrulama: `npm run dev` ile route geçişlerinde (lazy-loaded sayfalar) yükleme ekranını gözlemle
- Dark mode'da kontrol
- Mevcut testler varsa (`AppRoutes` ile ilgili) çalıştır
