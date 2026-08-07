import { describe, it, expect } from 'vitest';
import { kullaniciyaGosterilecekHata } from '../errorMessages';

const axiosHatasi = (status: number, data?: unknown) => ({
  isAxiosError: true,
  response: { status, data },
});

describe('kullaniciyaGosterilecekHata', () => {
  it('sunucuya hiç ulaşılamadığında bağlantıdan bahseder', () => {
    const mesaj = kullaniciyaGosterilecekHata({ isAxiosError: true, code: 'ERR_NETWORK' });

    expect(mesaj).toMatch(/bağlantı/i);
    expect(mesaj).not.toMatch(/network|error/i);
  });

  it('zaman aşımında beklemekten bahseder', () => {
    const mesaj = kullaniciyaGosterilecekHata({ isAxiosError: true, code: 'ECONNABORTED' });

    expect(mesaj).toMatch(/uzun sürdü|zaman/i);
  });

  it('sunucudan gelen düzgün Türkçe mesajı olduğu gibi gösterir', () => {
    const mesaj = kullaniciyaGosterilecekHata(
      axiosHatasi(409, { error: 'Bu e-posta adresi başka bir hesapta kayıtlı.' }),
    );

    expect(mesaj).toBe('Bu e-posta adresi başka bir hesapta kayıtlı.');
  });

  it('İngilizce teknik mesajı Türkçe karşılığıyla değiştirir', () => {
    expect(kullaniciyaGosterilecekHata(axiosHatasi(500, { error: 'Internal server error' }))).toBe(
      'Sunucuda bir sorun çıktı. Birazdan tekrar deneyin, sürerse okul yönetimine bildirin.',
    );
  });

  it('Türkçe harf içermeyen düzgün Türkçe cümleyi de gösterir', () => {
    expect(kullaniciyaGosterilecekHata(axiosHatasi(400, { error: 'Talep kaydedilemedi.' }))).toBe(
      'Talep kaydedilemedi.',
    );
  });

  it('bilinmeyen İngilizce mesajı ham haliyle göstermez', () => {
    const mesaj = kullaniciyaGosterilecekHata(
      axiosHatasi(400, { error: 'Cast to ObjectId failed for value "abc"' }),
    );

    expect(mesaj).not.toMatch(/ObjectId/);
    expect(mesaj).toMatch(/[çğıöşü]/i);
  });

  it('oturum düştüğünde tekrar giriş yapmayı söyler', () => {
    const mesaj = kullaniciyaGosterilecekHata(axiosHatasi(401, { error: 'Access token required' }));

    expect(mesaj).toMatch(/giriş/i);
  });

  it('yetki yoksa yetkiden bahseder', () => {
    const mesaj = kullaniciyaGosterilecekHata(
      axiosHatasi(403, { error: 'Insufficient permissions' }),
    );

    expect(mesaj).toMatch(/yetki/i);
  });

  it('hız sınırında ne kadar bekleneceğini ima eder', () => {
    const mesaj = kullaniciyaGosterilecekHata(axiosHatasi(429, { error: 'Rate limit exceeded' }));

    expect(mesaj).toMatch(/bekle/i);
  });

  it('404 için kaynağın bulunamadığını söyler', () => {
    const mesaj = kullaniciyaGosterilecekHata(axiosHatasi(404, { error: 'User not found' }));

    expect(mesaj).toMatch(/bulunamadı/i);
  });

  it('dosya çok büyükse boyuttan bahseder', () => {
    expect(kullaniciyaGosterilecekHata(axiosHatasi(413))).toMatch(/büyük/i);
  });

  it('doğrulama hatalarını birleştirip gösterir', () => {
    const mesaj = kullaniciyaGosterilecekHata(
      axiosHatasi(400, { errors: [{ msg: 'Ad Soyad zorunludur' }, { msg: 'Sınıf zorunludur' }] }),
    );

    expect(mesaj).toContain('Ad Soyad zorunludur');
    expect(mesaj).toContain('Sınıf zorunludur');
  });

  it('hiçbir bilgi yoksa bile boş veya İngilizce bir şey dönmez', () => {
    const mesaj = kullaniciyaGosterilecekHata(undefined);

    expect(mesaj.length).toBeGreaterThan(10);
    expect(mesaj).toMatch(/[çğıöşü]/i);
  });

  it('verilen yedek mesajı bilinmeyen durumda kullanır', () => {
    const mesaj = kullaniciyaGosterilecekHata(new Error('boom'), 'Ödevler yüklenemedi.');

    expect(mesaj).toBe('Ödevler yüklenemedi.');
  });
});
