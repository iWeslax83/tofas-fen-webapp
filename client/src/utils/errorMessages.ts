/**
 * Kullanıcıya gösterilecek hata metnini üreten tek yer.
 *
 * Sunucu bazen düzgün Türkçe cümleler döndürüyor, bazen "Internal server
 * error" veya mongoose'un "Cast to ObjectId failed" gibi geliştiriciye
 * yazılmış metinler. İkincisini olduğu gibi ekrana basmak kullanıcıya hiçbir
 * şey anlatmıyor, bu yüzden burada süzüyoruz: tanıdığımız teknik metinleri
 * Türkçe karşılığıyla, tanımadıklarımızı da HTTP durumuna uygun bir cümleyle
 * değiştiriyoruz.
 */

const GENEL_YEDEK = 'Beklenmedik bir sorun çıktı. Sayfayı yenileyip tekrar deneyin.';

/** Sunucunun ya da kütüphanelerin ürettiği, kullanıcıya bir şey anlatmayan metinler. */
const TEKNIK_KARSILIKLAR: Array<{ kalip: RegExp; mesaj: string }> = [
  {
    kalip: /internal (server )?error|sunucu hatası|unexpected error/i,
    mesaj: 'Sunucuda bir sorun çıktı. Birazdan tekrar deneyin, sürerse okul yönetimine bildirin.',
  },
  {
    kalip:
      /access token required|authentication required|invalid or expired (access )?token|unauthorized|yetkisiz erişim/i,
    mesaj: 'Oturumunuz sona ermiş görünüyor. Tekrar giriş yapın.',
  },
  {
    kalip: /insufficient permissions|forbidden|erişim reddedildi|erişim engellendi/i,
    mesaj: 'Bu işlem için yetkiniz yok.',
  },
  {
    kalip: /rate limit exceeded|too many requests/i,
    mesaj: 'Çok fazla deneme yapıldı. Birkaç dakika bekleyip tekrar deneyin.',
  },
  {
    kalip: /validation failed|invalid input types|geçersiz istek/i,
    mesaj: 'Girdiğiniz bilgilerde bir sorun var. Alanları kontrol edip tekrar deneyin.',
  },
  {
    kalip: /not found|bulunamadi/i,
    mesaj: 'Aradığınız kayıt bulunamadı. Silinmiş olabilir.',
  },
  {
    kalip: /update failed|güncelleme başarısız/i,
    mesaj: 'Değişiklikler kaydedilemedi. Tekrar deneyin.',
  },
  {
    kalip: /duplicate|already exists|e11000/i,
    mesaj: 'Bu kayıt zaten var.',
  },
  {
    kalip: /cast to \w+ failed|objectid|econnrefused|enotfound|socket hang up|json/i,
    mesaj: GENEL_YEDEK,
  },
];

const DURUM_MESAJLARI: Record<number, string> = {
  400: 'Girdiğiniz bilgilerde bir sorun var. Alanları kontrol edip tekrar deneyin.',
  401: 'Oturumunuz sona ermiş görünüyor. Tekrar giriş yapın.',
  403: 'Bu işlem için yetkiniz yok.',
  404: 'Aradığınız kayıt bulunamadı. Silinmiş olabilir.',
  408: 'İstek çok uzun sürdü. Tekrar deneyin.',
  409: 'Bu kayıt başka bir kayıtla çakışıyor.',
  413: 'Dosya çok büyük. Daha küçük bir dosya seçin.',
  415: 'Bu dosya türü desteklenmiyor.',
  429: 'Çok fazla deneme yapıldı. Birkaç dakika bekleyip tekrar deneyin.',
  500: 'Sunucuda bir sorun çıktı. Birazdan tekrar deneyin, sürerse okul yönetimine bildirin.',
  502: 'Sunucuya şu an ulaşılamıyor. Birkaç dakika sonra tekrar deneyin.',
  503: 'Sistem şu an bakımda ya da çok yoğun. Birkaç dakika sonra tekrar deneyin.',
  504: 'Sunucu zamanında cevap vermedi. Tekrar deneyin.',
};

/** İngilizce metinlerde sık geçen, Türkçe'de geçmeyen kelimeler. */
const INGILIZCE_KELIMELER =
  /\b(the|and|not|found|failed|failure|error|invalid|required|request|response|server|internal|permission|permissions|denied|unauthorized|forbidden|token|expired|missing|already|exists|unable|cannot|must|please|value|field|user|password|login|timeout|connection|database|unexpected)\b/gi;

/**
 * Metin geliştiriciye yazılmış İngilizce bir hata mı.
 *
 * Varsayılan davranış metni GÖSTERMEK: bu depodaki sunucu mesajlarının çoğu
 * zaten düzgün Türkçe ve "Talep kaydedilemedi." gibi cümlelerde Türkçe'ye özgü
 * harf bulunmayabiliyor. O yüzden Türkçe'yi tahmin etmeye çalışmak yerine
 * İngilizce'yi arıyoruz: Türkçe'ye özgü harf yoksa ve iki ya da daha fazla
 * İngilizce kelime geçiyorsa metni süzüyoruz.
 */
function ingilizceGorunuyorMu(metin: string): boolean {
  if (/[çğıöşüÇĞİÖŞÜ]/.test(metin)) return false;
  const eslesme = metin.match(INGILIZCE_KELIMELER);
  return (eslesme?.length ?? 0) >= 2;
}

function teknikKarsilik(metin: string): string | null {
  for (const { kalip, mesaj } of TEKNIK_KARSILIKLAR) {
    if (kalip.test(metin)) return mesaj;
  }
  return null;
}

type HataGovdesi = {
  error?: unknown;
  message?: string;
  errors?: unknown;
};

/** Doğrulama hatalarını ("errors" dizisi) tek bir cümlede toplar. */
function dogrulamaMesaji(govde: HataGovdesi | undefined): string | null {
  if (!govde || !Array.isArray(govde.errors)) return null;

  const parcalar = govde.errors
    .map((e) => {
      if (typeof e === 'string') return e;
      if (e && typeof e === 'object') {
        const o = e as Record<string, unknown>;
        const m = o.msg ?? o.message;
        if (typeof m === 'string') return m;
      }
      return '';
    })
    .filter(Boolean);

  return parcalar.length > 0 ? parcalar.join(', ') : null;
}

/** Yanıt gövdesinden sunucunun yazdığı metni çıkarır. */
function sunucuMetni(govde: HataGovdesi | undefined): string | null {
  if (!govde) return null;

  if (typeof govde.error === 'string' && govde.error.trim()) return govde.error.trim();
  if (govde.error && typeof govde.error === 'object') {
    const m = (govde.error as Record<string, unknown>).message;
    if (typeof m === 'string' && m.trim()) return m.trim();
  }
  if (typeof govde.message === 'string' && govde.message.trim()) return govde.message.trim();

  return null;
}

/**
 * Herhangi bir hata nesnesinden kullanıcıya gösterilecek düz Türkçe cümleyi
 * üretir. `yedek` verilirse, durumu anlayamadığımız hallerde o kullanılır.
 */
export function kullaniciyaGosterilecekHata(hata: unknown, yedek?: string): string {
  const h = hata as
    | (HataGovdesi & {
        code?: string;
        status?: number;
        response?: { status?: number; data?: HataGovdesi | string };
      })
    | undefined;

  // Sunucuya hiç ulaşılamamış: ortada cevap da, gövde de yok.
  if (h && !h.response) {
    if (h.code === 'ECONNABORTED' || /timeout/i.test(h.message ?? '')) {
      return 'İstek çok uzun sürdü. Bağlantınızı kontrol edip tekrar deneyin.';
    }
    if (h.code === 'ERR_NETWORK' || /network/i.test(h.message ?? '')) {
      return 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
    }
  }

  // Çıplak bir JS Error'ün message'ı ("Cannot read properties of undefined")
  // geliştiriciye yazılmıştır, ekrana basılmaz. Çağıranın verdiği yedek varsa
  // o kullanılır.
  if (hata instanceof Error && !h?.response) {
    return yedek ?? GENEL_YEDEK;
  }

  // Gövde ya axios sarmalayıcısının içinde, ya da nesnenin kendisinde olabilir:
  // extractError her iki şekli de görüyor.
  const durum = h?.response?.status ?? h?.status;
  const ham = h?.response?.data ?? h;
  const govde: HataGovdesi | undefined = typeof ham === 'string' ? { error: ham } : ham;

  const dogrulama = dogrulamaMesaji(govde);
  if (dogrulama) return dogrulama;

  const metin = sunucuMetni(govde);
  if (metin) {
    const karsilik = teknikKarsilik(metin);
    if (karsilik) return karsilik;
    if (metin.length >= 8 && !ingilizceGorunuyorMu(metin)) return metin;
  }

  if (durum && DURUM_MESAJLARI[durum]) return DURUM_MESAJLARI[durum];
  if (durum && durum >= 500) return DURUM_MESAJLARI[500];

  return yedek ?? GENEL_YEDEK;
}
