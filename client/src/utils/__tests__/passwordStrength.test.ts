import { describe, it, expect } from 'vitest';
import { scorePassword } from '../passwordStrength';

describe('scorePassword', () => {
  it('boş şifreye en düşük seviyeyi verir', () => {
    expect(scorePassword('').level).toBe(0);
  });

  it('6 karakterlik basit şifreyi zayıf sayar', () => {
    expect(scorePassword('abcdef').level).toBeLessThanOrEqual(1);
  });

  it('tekrar eden karakterleri cezalandırır', () => {
    expect(scorePassword('aaaaaaaaaa').level).toBe(0);
  });

  it('ardışık rakam dizisini cezalandırır', () => {
    expect(scorePassword('123456').level).toBe(0);
  });

  it('klavye dizisini cezalandırır', () => {
    expect(scorePassword('qwerty').level).toBe(0);
  });

  it('yaygın Türkçe şifreyi cezalandırır', () => {
    expect(scorePassword('parola').level).toBe(0);
  });

  it('kullanıcı ipucunu içeren şifreyi cezalandırır', () => {
    expect(scorePassword('ahmet2020', ['ahmet']).level).toBeLessThanOrEqual(1);
  });

  it('uzun ve çeşitli şifreyi güçlü sayar', () => {
    expect(scorePassword('Kirmizi-Bisiklet-42').level).toBe(3);
  });

  it('orta uzunlukta karışık şifreyi orta sayar', () => {
    expect(scorePassword('Bisiklet7').level).toBe(2);
  });

  it('her seviye için boş olmayan etiket ve ipucu döner', () => {
    for (const pw of ['', 'abcdef', 'Bisiklet7', 'Kirmizi-Bisiklet-42']) {
      const sonuc = scorePassword(pw);
      expect(sonuc.label.length).toBeGreaterThan(0);
      expect(sonuc.hint.length).toBeGreaterThan(0);
    }
  });
});
