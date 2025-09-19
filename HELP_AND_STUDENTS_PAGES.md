# Yardım ve Öğrencilerim Sayfaları

Bu dokümanda yeni eklenen **Yardım** ve **Öğrencilerim** sayfalarının özellikleri ve kullanımı açıklanmaktadır.

## 🆘 Yardım Sayfası (`/yardim`)

### Özellikler
- **Sık Sorulan Sorular (FAQ)**: Kategorilere ayrılmış soru-cevap sistemi
- **Arama Fonksiyonu**: Soruları hızlıca bulma
- **Kategori Filtreleme**: Konulara göre soru filtreleme
- **İletişim Bilgileri**: Destek ekiplerinin iletişim bilgileri
- **Hızlı Erişim**: Profil ve ayarlar sayfalarına kolay erişim

### Kategoriler
- Giriş ve Hesap
- Ödevler
- Ders Programı
- Duyurular
- Kulüpler
- Teknik Destek
- Mobil Uygulama

### Kullanım
1. Dashboard'dan "Yardım" butonuna tıklayın
2. Sol menüden kategori seçin
3. Arama kutusunu kullanarak soru arayın
4. Sorulara tıklayarak cevapları görüntüleyin
5. İletişim bilgilerini kullanarak destek alın

---

## 👥 Öğrencilerim Sayfası (`/teacher/ogrencilerim`)

### Özellikler
- **Öğrenci Listesi**: Grid ve liste görünümü
- **Detaylı Filtreleme**: Sınıf, durum ve arama filtreleri
- **Sıralama**: Ad, not, devamsızlık gibi kriterlere göre sıralama
- **İstatistikler**: Sınıf bazında performans verileri
- **Öğrenci Detayları**: Genişletilebilir öğrenci kartları
- **Hızlı İşlemler**: Detay görüntüleme, mesaj gönderme, düzenleme

### Görünüm Modları
- **Grid Görünümü**: Kart tabanlı, detaylı bilgi
- **Liste Görünümü**: Tablo formatında, kompakt görünüm

### Filtreler
- **Arama**: Ad, soyad, öğrenci no
- **Sınıf**: Belirli sınıfları filtreleme
- **Durum**: Aktif, pasif, mezun öğrenciler
- **Sıralama**: Artan/azalan sıralama

### İstatistikler
- Toplam öğrenci sayısı
- Ortalama not
- Aktif öğrenci sayısı
- Sınıf bazında performans

### Kullanım
1. Dashboard'dan "Öğrencilerim" butonuna tıklayın
2. Filtreleri kullanarak öğrencileri bulun
3. Grid/Liste görünümü arasında geçiş yapın
4. Öğrenci kartlarına tıklayarak detayları görüntüleyin
5. İstatistikleri inceleyin
6. Excel'e aktarma ve yeni öğrenci ekleme işlemlerini yapın

---

## 🚀 Teknik Özellikler

### Teknolojiler
- **React 18** + **TypeScript**
- **Tailwind CSS** - Modern ve responsive tasarım
- **Framer Motion** - Smooth animasyonlar
- **Lucide React** - İkon kütüphanesi

### Responsive Tasarım
- Mobil uyumlu
- Tablet ve desktop optimizasyonu
- Grid sistem ile esnek layout

### Performans
- Lazy loading
- Optimized re-renders
- Efficient state management

---

## 📱 Responsive Breakpoints

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

---

## 🎨 Tasarım Sistemi

### Renkler
- **Primary**: Blue (#3B82F6)
- **Success**: Green (#10B981)
- **Warning**: Yellow (#F59E0B)
- **Error**: Red (#EF4444)
- **Neutral**: Gray (#6B7280)

### Typography
- **Heading**: Inter, semibold
- **Body**: Inter, regular
- **Monospace**: JetBrains Mono (kod blokları için)

### Spacing
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px

---

## 🔧 Kurulum ve Çalıştırma

### Gereksinimler
- Node.js 18+
- npm veya yarn

### Kurulum
```bash
cd client
npm install
```

### Geliştirme Sunucusu
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

---

## 📋 API Entegrasyonu

### Mevcut Durum
- Mock data ile çalışıyor
- Gerçek API entegrasyonu için hazır

### Gerekli API Endpoints
```typescript
// Öğrenci listesi
GET /api/teacher/students

// Öğrenci detayı
GET /api/teacher/students/:id

// Öğrenci güncelleme
PUT /api/teacher/students/:id

// Yeni öğrenci ekleme
POST /api/teacher/students
```

---

## 🐛 Bilinen Sorunlar

- Şu anda mock data kullanılıyor
- Gerçek API entegrasyonu gerekiyor
- Fotoğraf yükleme özelliği eklenmeli

---

## 🚧 Gelecek Özellikler

- [ ] Gerçek API entegrasyonu
- [ ] Fotoğraf yükleme
- [ ] PDF export
- [ ] Toplu işlemler
- [ ] Bildirim sistemi
- [ ] Offline desteği

---

## 📞 Destek

Herhangi bir sorun yaşarsanız:
- **IT Destek**: it@tofas.edu.tr
- **Öğrenci İşleri**: ogrenci@tofas.edu.tr
- **Genel Sekreterlik**: sekreter@tofas.edu.tr

---

## 📝 Lisans

Bu proje Tofaş Fen Lisesi için geliştirilmiştir.
