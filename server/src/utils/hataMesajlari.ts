/**
 * Kullanıcıya dönen hata metinlerinin tek kaynağı.
 *
 * Sunucu uzun süre "Internal server error", "Access token required" gibi
 * geliştiriciye yazılmış İngilizce metinler döndürdü. İstemci bunları
 * `client/src/utils/errorMessages.ts` içinde Türkçe'ye çeviriyordu, ama
 * çeviri bir tahmin katmanı: kalıba uymayan her yeni metin kullanıcıya
 * olduğu gibi düşüyordu. Metinleri kaynağında Türkçe yazmak o katmanı
 * gereksiz kılıyor.
 *
 * Kural: ne olduğunu ve kullanıcının ne yapabileceğini söyle. "Geçersiz
 * istek" değil, "Alanları kontrol edip tekrar deneyin".
 */
export const HATA = {
  /** 401, oturum yok ya da düşmüş. */
  GIRIS_GEREKLI:
    'Bu işlem için giriş yapmanız gerekiyor. Oturumunuz kapanmış olabilir, tekrar giriş yapın.',

  /** 401, token iptal edilmiş (şifre değişikliği, çıkış, yönetici müdahalesi). */
  OTURUM_SONLANDI: 'Oturumunuz sonlandırıldı. Tekrar giriş yapın.',

  /** 403, kimlik doğru ama rol yetmiyor. */
  YETKI_YOK: 'Bu işlem için yetkiniz yok.',

  /** 403, IP kısıtlaması. */
  ERISIM_ENGELLI:
    'Bu sayfaya bulunduğunuz ağdan erişilemiyor. Okul ağından deneyin ya da okul yönetimine başvurun.',

  /** 500, beklenmedik sunucu hatası. */
  SUNUCU_HATASI:
    'Sunucuda beklenmedik bir sorun çıktı. Birazdan tekrar deneyin, sürerse okul yönetimine bildirin.',

  /** 404, kullanıcı kaydı yok. */
  KULLANICI_YOK: 'Kullanıcı bulunamadı. Kayıt silinmiş olabilir.',

  /** 400, doğrulama hatası. Ayrıntılar `details` alanında. */
  GIRDI_HATALI:
    'Girdiğiniz bilgilerde eksik ya da hatalı alan var. Alanları kontrol edip tekrar deneyin.',

  /** 400, güncelleme kaydedilemedi. */
  GUNCELLEME_BASARISIZ: 'Değişiklikler kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.',

  /** 400, eksik yol parametresi. */
  OGRENCI_NO_GEREKLI: 'Öğrenci numarası gerekiyor.',

  /** 413, gövde 10MB sınırını aştı. */
  ISTEK_COK_BUYUK: 'Gönderdiğiniz veri çok büyük (en fazla 10MB). Daha küçük bir dosya seçin.',

  /** 429, genel istek sınırı. */
  COK_FAZLA_ISTEK: 'Çok fazla istek gönderildi. 15 dakika sonra tekrar deneyin.',

  /** 429, giriş denemesi sınırı. */
  COK_FAZLA_GIRIS: 'Çok fazla giriş denemesi yapıldı. 15 dakika sonra tekrar deneyin.',

  /** 429, dosya yükleme sınırı. */
  COK_FAZLA_YUKLEME: 'Saatlik dosya yükleme sınırına ulaştınız. Bir saat sonra tekrar deneyin.',

  /** 429, yönetim uçları sınırı. */
  COK_FAZLA_YONETIM_ISTEGI: 'Çok fazla yönetim isteği gönderildi. 15 dakika sonra tekrar deneyin.',
} as const;
