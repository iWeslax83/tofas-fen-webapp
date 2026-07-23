import { LegalPageLayout } from './LegalPageLayout';

export default function KullanimSartlariPage() {
  return (
    <LegalPageLayout title="Kullanım Şartları" updatedAt="23 Temmuz 2026">
      <p>
        Bu Kullanım Şartları, <strong>Tofaş Fen Lisesi</strong> Bilgilendirme Sistemi
        (&quot;Sistem&quot;) hesabınızı kullanırken uymanız gereken kuralları belirler.
        Sistem&apos;e giriş yaparak bu şartları kabul etmiş sayılırsınız.
      </p>

      <h2>1. Hesap ve Erişim</h2>
      <p>
        Sistem hesapları okul yönetimi tarafından öğrenci, veli, öğretmen, yönetici ve hizmetli
        rolleri için oluşturulur. Hesabınıza yalnızca size tanımlanmış rol kapsamındaki bilgilere
        erişmek amacıyla giriş yapabilirsiniz. Giriş bilgilerinizi (T.C. kimlik numarası, şifre, iki
        faktörlü doğrulama kodu) üçüncü kişilerle paylaşmamakla yükümlüsünüz.
      </p>

      <h2>2. Kabul Edilebilir Kullanım</h2>
      <ul>
        <li>Sistem yalnızca okulun eğitim-öğretim ve idari süreçleri için kullanılabilir.</li>
        <li>Başka bir kullanıcının hesabına yetkisiz erişim sağlanamaz.</li>
        <li>
          Sistem üzerinden elde edilen veriler (not, iletişim bilgisi vb.) amacı dışında
          kullanılamaz, üçüncü kişilerle paylaşılamaz.
        </li>
        <li>
          Sistemin işleyişini bozacak, aşırı yük bindirecek veya güvenliğini zafiyete uğratacak
          eylemlerde bulunulamaz.
        </li>
      </ul>

      <h2>3. İçerik Sorumluluğu</h2>
      <p>
        Dilekçe, evci talebi, mesaj gibi Sistem üzerinden girilen içeriklerin doğruluğundan
        kullanıcı sorumludur. Yanlış veya yanıltıcı bilgi girilmesi disiplin sürecine konu olabilir.
      </p>

      <h2>4. Fikri Mülkiyet</h2>
      <p>
        Sistem&apos;in tasarımı, yazılımı ve içeriği Tofaş Fen Lisesi&apos;ne aittir. İzinsiz
        kopyalanamaz, dağıtılamaz veya ticari amaçla kullanılamaz.
      </p>

      <h2>5. Hizmetin Değiştirilmesi</h2>
      <p>
        Okul yönetimi, Sistem&apos;in işleyişini, kapsamını veya bu şartları önceden bildirmeksizin
        güncelleyebilir. Güncel şartlar bu sayfada yayımlanır.
      </p>

      <h2>6. Sorumluluk Sınırı</h2>
      <p>
        Sistem &quot;olduğu gibi&quot; sunulur. Planlı bakım, teknik arıza veya kullanıcı kaynaklı
        hatalardan doğabilecek erişim kesintilerinden okul, makul özeni göstermek kaydıyla sorumlu
        tutulamaz.
      </p>

      <h2>7. İletişim</h2>
      <p>
        Kullanım şartlarına ilişkin sorularınız için 0224 262 24 01 numaralı telefondan veya okul
        idaresi üzerinden bize ulaşabilirsiniz.
      </p>
    </LegalPageLayout>
  );
}
