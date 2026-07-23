import { LegalPageLayout } from './LegalPageLayout';

export default function KvkkAydinlatmaMetniPage() {
  return (
    <LegalPageLayout title="KVKK Aydınlatma Metni" updatedAt="23 Temmuz 2026">
      <p>
        Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) m. 10
        uyarınca, veri sorumlusu sıfatıyla <strong>Tofaş Fen Lisesi</strong> tarafından,
        Bilgilendirme Sistemi (&quot;Sistem&quot;) üzerinden işlenen kişisel verileriniz hakkında
        sizi bilgilendirmek amacıyla hazırlanmıştır.
      </p>

      <h2>1. Veri Sorumlusu</h2>
      <p>
        <strong>Unvan:</strong> Tofaş Fen Lisesi
        <br />
        <strong>Adres:</strong> 19 Mayıs, Dostluk Cd. No:3 A-B/C, 16120 Nilüfer/Bursa
        <br />
        <strong>Telefon:</strong> 0224 262 24 01
        <br />
        <strong>E-posta:</strong>{' '}
        <em>
          (TODO — KVKK başvuruları için resmî e-posta adresi okul yönetimi tarafından
          bildirilecektir)
        </em>
      </p>

      <h2>2. İşlenen Kişisel Veri Kategorileri</h2>
      <ul>
        <li>
          Kimlik bilgisi: ad soyad, T.C. kimlik numarası (veri tabanında şifrelenmiş olarak
          saklanır)
        </li>
        <li>İletişim bilgisi: e-posta adresi</li>
        <li>Eğitim/akademik veri: notlar, ödevler, ders programı, devam ve performans kayıtları</li>
        <li>Pansiyon/yatılılık verisi: oda bilgisi, yemek listesi, nöbetçi listesi</li>
        <li>İzin ve talep kayıtları: evci (izin) talepleri, dilekçeler, randevu kayıtları</li>
        <li>Duyuru ve bildirim kayıtları, push bildirim aboneliği (cihaz bilgisi)</li>
        <li>Veli-öğrenci ilişki bilgisi (hesap eşleştirmesi)</li>
        <li>İşlem güvenliği verisi: IP adresi, tarayıcı bilgisi, giriş/oturum kayıtları</li>
      </ul>
      <p>
        Sistem üzerinde <strong>sağlık verisi işlenmemektedir.</strong>
      </p>

      <h2>3. İşleme Amaçları</h2>
      <p>
        Kişisel verileriniz; eğitim-öğretim faaliyetlerinin yürütülmesi, öğrenci ve veli
        iletişiminin sağlanması, pansiyon/yatılılık hizmetlerinin yürütülmesi, izin ve dilekçe
        süreçlerinin yönetilmesi, sistem güvenliğinin sağlanması ve yasal yükümlülüklerin yerine
        getirilmesi amaçlarıyla işlenmektedir.
      </p>

      <h2>4. Hukuki Sebep</h2>
      <p>
        Kişisel verileriniz KVKK m. 5/2 kapsamında; bir sözleşmenin kurulması veya ifasıyla doğrudan
        doğruya ilgili olması, veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi için
        zorunlu olması ve ilgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla veri
        sorumlusunun meşru menfaati için veri işlenmesinin zorunlu olması hukuki sebeplerine
        dayanılarak işlenmektedir.
      </p>

      <h2>5. Aktarım</h2>
      <p>
        Kişisel verileriniz, Sistem&apos;in çalışması için gerekli olan barındırma (hosting),
        e-posta gönderim ve push bildirim altyapı hizmet sağlayıcıları dışında üçüncü taraflarla
        paylaşılmamaktadır. Bu hizmet sağlayıcılarla veri işleyen sıfatıyla gerekli sözleşmesel
        güvenceler sağlanmaktadır.
      </p>

      <h2>6. Saklama Süresi</h2>
      <p>
        Kişisel verileriniz, ilgili mevzuatta öngörülen süreler saklı kalmak kaydıyla,
        <strong> mezuniyet tarihinden itibaren 2 (iki) yıl</strong> boyunca saklanır ve bu sürenin
        sonunda silinir, yok edilir veya anonim hale getirilir.
      </p>

      <h2>7. Haklarınız</h2>
      <p>KVKK m. 11 uyarınca veri sorumlusuna başvurarak;</p>
      <ul>
        <li>Kişisel verinizin işlenip işlenmediğini öğrenme,</li>
        <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
        <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
        <li>Yurt içinde/yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
        <li>Eksik/yanlış işlenmişse düzeltilmesini isteme,</li>
        <li>KVKK m. 7 şartları oluştuğunda silinmesini/yok edilmesini isteme,</li>
        <li>Aleyhinize bir sonucun ortaya çıkmasına itiraz etme,</li>
        <li>Kanuna aykırı işleme sebebiyle zararın giderilmesini talep etme</li>
      </ul>
      <p>
        haklarına sahipsiniz. Taleplerinizi yukarıda belirtilen iletişim kanalları üzerinden veya
        Sistem üzerinde sunulan başvuru mekanizması aracılığıyla iletebilirsiniz.
      </p>
    </LegalPageLayout>
  );
}
