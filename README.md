# 🎓 TOFAŞ Fen Lisesi - Öğrenci Bilgi Sistemi

Modern ve kullanıcı dostu bir okul bilgi sistemi. Bu proje, öğrenciler, öğretmenler, veliler ve yöneticiler için kapsamlı bir eğitim yönetim platformu sunmaktadır.

## ✨ Özellikler

### 🔐 Rol Bazlı Erişim
- **Öğrenci Paneli**: Ödevler, notlar, ders programı, duyurular ve kulüp yönetimi
- **Öğretmen Paneli**: Sınıf yönetimi, not girişi, ödev takibi ve kulüp danışmanlığı  
- **Veli Paneli**: Çocuğun akademik durumu, devam takibi ve okul iletişimi
- **Yönetici Paneli**: Sistem yönetimi, raporlama ve genel denetim

### 🎨 Modern Tasarım
- **Glassmorphism UI**: Modern cam efektli tasarım
- **Smooth Animations**: Framer Motion ile akıcı animasyonlar
- **Responsive Design**: Tüm cihazlarda mükemmel görünüm
- **Dark Theme**: Göz yormayan koyu tema

### 🚀 Teknolojiler
- **React 19**: Modern React hooks ve bileşenler
- **TypeScript**: Tip güvenliği ve geliştirilmiş geliştirici deneyimi
- **Framer Motion**: Profesyonel animasyonlar
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Hızlı geliştirme ve build süreci
- **React Router**: SPA routing yönetimi

## 🛠️ Kurulum

1. **Depoyu klonlayın**
   ```bash
   git clone [repo-url]
   cd tofas-fen-webapp
   ```

2. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```

3. **Geliştirme sunucusunu başlatın**
   ```bash
   npm run dev
   ```

4. **Tarayıcınızda açın**
   ```
   http://localhost:5173
   ```

## 🔑 Test Kullanıcıları

### Öğrenci
- **ID**: `2024001`
- **Şifre**: `ogrenci123`

### Öğretmen  
- **ID**: `T001`
- **Şifre**: `ogretmen123`

### Veli
- **ID**: `V001` 
- **Şifre**: `veli123`

### Yönetici
- **ID**: `A001`
- **Şifre**: `admin123`

## 📱 Ekran Görüntüleri

### Giriş Sayfası
- Modern glassmorphism tasarım
- Animasyonlu arka plan
- Rol bazlı otomatik yönlendirme

### Öğrenci Paneli
- Kişiselleştirilmiş dashboard
- Hızlı erişim menüleri
- Gerçek zamanlı istatistikler

### Responsive Tasarım
- Mobil uyumlu arayüz
- Tablet optimizasyonu
- Desktop deneyimi

## 🎯 Gelecek Özellikler

- [ ] **Gerçek Zamanlı Bildirimler**: WebSocket entegrasyonu
- [ ] **Çevrimdışı Destek**: Progressive Web App özellikleri
- [ ] **Çoklu Dil Desteği**: i18n entegrasyonu
- [ ] **Tema Seçenekleri**: Light/Dark mode toggle
- [ ] **API Entegrasyonu**: Backend servis bağlantısı
- [ ] **Dosya Yükleme**: Ödev ve döküman paylaşımı
- [ ] **Video Konferans**: Uzaktan eğitim desteği
- [ ] **Mobil Uygulama**: React Native versiyonu

## 🏗️ Proje Yapısı

```
src/
├── components/          # Yeniden kullanılabilir bileşenler
├── pages/              # Sayfa bileşenleri
│   ├── Dashboard/      # Panel sayfaları
│   └── LoginPage.tsx   # Giriş sayfası
├── data/               # JSON veri dosyaları
├── hooks/              # Custom React hooks
├── contexts/           # React context'leri  
├── types/              # TypeScript tip tanımları
└── assets/             # Statik dosyalar
```

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 🎓 TOFAŞ Fen Lisesi

Bu proje, TOFAŞ Fen Lisesi öğrencileri ve eğitim kadrosu için geliştirilmiştir. Modern eğitim teknolojilerini kullanarak, öğrenme deneyimini geliştirmeyi hedeflemektedir.

---

**Geliştirici**: TOFAŞ Fen Lisesi IT Ekibi  
**Version**: 1.0.0  
**Son Güncelleme**: 2024
