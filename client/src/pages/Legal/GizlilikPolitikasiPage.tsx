import { LegalPageLayout } from './LegalPageLayout';

export default function GizlilikPolitikasiPage() {
  return (
    <LegalPageLayout title="Gizlilik Politikası" updatedAt="23 Temmuz 2026">
      <p>
        Bu Gizlilik Politikası, <strong>Tofaş Fen Lisesi</strong> Bilgilendirme Sistemi
        (&quot;Sistem&quot;) kullanıcılarının (öğrenci, veli, öğretmen, yönetici, hizmetli)
        verilerinin nasıl toplandığını, kullanıldığını ve korunduğunu açıklar. Verilerin hangi
        hukuki sebeple işlendiğine ilişkin ayrıntılı bilgi için{' '}
        <a href="/kvkk-aydinlatma-metni">KVKK Aydınlatma Metni</a>&apos;ni inceleyiniz.
      </p>

      <h2>1. Topladığımız Bilgiler</h2>
      <p>
        Hesabınızı oluşturmak ve Sistem&apos;i işletmek için ad soyad, T.C. kimlik numarası
        (şifrelenmiş olarak saklanır) ve e-posta adresinizi toplarız. Kullanım sırasında notlar,
        ödevler, ders programı, devam/performans, pansiyon (oda, yemek listesi, nöbetçi listesi),
        evci/izin talepleri, dilekçeler, randevular, duyurular ve bildirim aboneliği gibi veriler
        sistem içinde oluşur. Sistem&apos;e erişim güvenliği için IP adresi, tarayıcı bilgisi ve
        giriş kayıtları tutulur.
      </p>

      <h2>2. Bilgileri Nasıl Kullanırız</h2>
      <ul>
        <li>Eğitim-öğretim, pansiyon ve idari süreçlerin yürütülmesi</li>
        <li>Öğrenci-veli-öğretmen arasında iletişimin sağlanması</li>
        <li>Hesap güvenliğinin sağlanması (iki faktörlü doğrulama, oturum yönetimi)</li>
        <li>Yasal yükümlülüklerin yerine getirilmesi</li>
      </ul>
      <p>Verileriniz pazarlama amacıyla kullanılmaz ve satılmaz.</p>

      <h2>3. Bilgi Paylaşımı</h2>
      <p>
        Verileriniz, Sistem&apos;in çalışması için gerekli barındırma (hosting), e-posta gönderimi
        ve push bildirim altyapısı sağlayıcıları dışında hiçbir üçüncü tarafla paylaşılmaz. Bu
        sağlayıcılar yalnızca hizmetin teknik olarak işletilmesi için gereken ölçüde veriye
        erişebilir.
      </p>

      <h2>4. Veri Güvenliği</h2>
      <p>
        T.C. kimlik numaranız veri tabanında şifrelenmiş olarak tutulur. Hesabınıza erişim şifreleme
        ve isteğe bağlı iki faktörlü doğrulama ile korunur. Sistem&apos;e yapılan kritik işlemler
        (giriş, şifre işlemleri) güvenlik amacıyla kayıt altına alınır.
      </p>

      <h2>5. Çerezler</h2>
      <p>
        Sistem, oturumunuzu açık tutmak için yalnızca zorunlu oturum çerezleri kullanır. Reklam veya
        üçüncü taraf takip çerezi kullanılmaz.
      </p>

      <h2>6. Saklama Süresi</h2>
      <p>
        Verileriniz mezuniyet tarihinden itibaren 2 yıl boyunca saklanır, bu sürenin ardından
        silinir veya anonim hale getirilir.
      </p>

      <h2>7. Haklarınız</h2>
      <p>
        Verilerinize erişim, düzeltme veya silme talepleriniz için{' '}
        <a href="/kvkk-aydinlatma-metni">KVKK Aydınlatma Metni</a>&apos;nde belirtilen iletişim
        kanallarını kullanabilirsiniz.
      </p>
    </LegalPageLayout>
  );
}
