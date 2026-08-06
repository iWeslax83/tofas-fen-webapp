import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { User } from '../../../models/User';
import { PasswordAuditLog } from '../../../models/PasswordAuditLog';
import {
  AuthService,
  BCRYPT_COST,
  usingDistributedPassword,
} from '../../../modules/auth/services/authService';

const ID = 'degistiren_kullanici';
const ESKI = 'EskiSifre1';
const YENI = 'yenisifre';

async function createUser(overrides: Record<string, unknown> = {}) {
  await User.create({
    id: ID,
    adSoyad: 'Şifre Testi',
    rol: 'student',
    sifre: await bcrypt.hash(ESKI, BCRYPT_COST),
    passwordLastSetAt: new Date('2026-01-01'),
    isActive: true,
    tokenVersion: 4,
    childId: [],
    ...overrides,
  });
}

describe('AuthService.changePassword', () => {
  beforeEach(async () => {
    await Promise.all([User.deleteMany({ id: ID }), PasswordAuditLog.deleteMany({})]);
    await createUser();
  });

  it('doğru mevcut şifreyle yeni şifreyi yazar', async () => {
    await AuthService.changePassword(ID, ESKI, YENI);

    const user = await User.findOne({ id: ID }).select('+sifre');
    expect(await bcrypt.compare(YENI, user!.sifre!)).toBe(true);
  });

  it('passwordSelfChangedAt damgasını atar', async () => {
    const oncesi = Date.now();
    await AuthService.changePassword(ID, ESKI, YENI);

    const user = await User.findOne({ id: ID });
    expect(user!.passwordSelfChangedAt!.getTime()).toBeGreaterThanOrEqual(oncesi);
  });

  it('tokenVersion değerini artırır', async () => {
    await AuthService.changePassword(ID, ESKI, YENI);

    const user = await User.findOne({ id: ID });
    expect(user!.tokenVersion).toBe(5);
  });

  it('yanlış mevcut şifreyi reddeder ve hiçbir şeyi değiştirmez', async () => {
    await expect(AuthService.changePassword(ID, 'BambaskaSifre1', YENI)).rejects.toThrow();

    const user = await User.findOne({ id: ID }).select('+sifre');
    expect(await bcrypt.compare(ESKI, user!.sifre!)).toBe(true);
    expect(user!.tokenVersion).toBe(4);
    expect(user!.passwordSelfChangedAt).toBeUndefined();
  });

  it('yeni şifre mevcut şifreyle aynıysa reddeder', async () => {
    await expect(AuthService.changePassword(ID, ESKI, ESKI)).rejects.toThrow();
  });

  it('6 karakterden kısa yeni şifreyi reddeder', async () => {
    await expect(AuthService.changePassword(ID, ESKI, 'kisa1')).rejects.toThrow();
  });

  it('audit log kaydı düşer ve kayıtta düz şifre bulunmaz', async () => {
    await AuthService.changePassword(ID, ESKI, YENI);

    const kayitlar = await PasswordAuditLog.find({ action: 'self_change' }).lean();
    expect(kayitlar).toHaveLength(1);
    expect(JSON.stringify(kayitlar[0])).not.toContain(YENI);
    expect(JSON.stringify(kayitlar[0])).not.toContain(ESKI);
  });

  it('hiç şifresi olmayan kullanıcı TCKN ile değiştirebilir', async () => {
    await User.deleteMany({ id: ID });
    await createUser({ sifre: undefined, passwordLastSetAt: undefined, tckn: '12345678901' });

    await AuthService.changePassword(ID, '12345678901', YENI);

    const user = await User.findOne({ id: ID }).select('+sifre');
    expect(await bcrypt.compare(YENI, user!.sifre!)).toBe(true);
  });

  it('şifre değişince kullanıcı dağıtılan şifreyi kullanmıyor sayılır', async () => {
    await AuthService.changePassword(ID, ESKI, YENI);

    const user = await User.findOne({ id: ID });
    expect(usingDistributedPassword(user!)).toBe(false);
  });
});

describe('usingDistributedPassword', () => {
  it('hiç kendi şifresini belirlememişse true', () => {
    expect(usingDistributedPassword({ passwordLastSetAt: new Date('2026-01-01') })).toBe(true);
  });

  it('kendi şifresi admin damgasından yeniyse false', () => {
    expect(
      usingDistributedPassword({
        passwordLastSetAt: new Date('2026-01-01'),
        passwordSelfChangedAt: new Date('2026-02-01'),
      }),
    ).toBe(false);
  });

  it('admin sonradan reset attıysa tekrar true', () => {
    expect(
      usingDistributedPassword({
        passwordSelfChangedAt: new Date('2026-01-01'),
        passwordLastSetAt: new Date('2026-03-01'),
      }),
    ).toBe(true);
  });
});
