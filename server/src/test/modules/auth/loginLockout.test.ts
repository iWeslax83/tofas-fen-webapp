import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { User } from '../../../models/User';
import { AuthService, BCRYPT_COST } from '../../../modules/auth/services/authService';

/**
 * CAPTCHA katmanı kaldırıldıktan sonra geriye kalan tek brute-force koruması
 * hesap başına kilit. Bu testler o davranışı sabitler.
 */

const ID = 'lockout_user';
const SIFRE = 'DogruSifre1';

async function createUser() {
  await User.create({
    id: ID,
    adSoyad: 'Kilit Testi',
    rol: 'student',
    sifre: await bcrypt.hash(SIFRE, BCRYPT_COST),
    isActive: true,
    tokenVersion: 0,
    failedLoginAttempts: 0,
    childId: [],
  });
}

describe('giriş kilidi', () => {
  beforeEach(async () => {
    await User.deleteMany({ id: ID });
    await createUser();
  });

  it('üçüncü hatalı denemeden sonra doğru şifreyle giriş yapılabilir', async () => {
    const meta = { ip: '10.0.0.1', userAgent: 'test' };

    for (let i = 0; i < 3; i++) {
      await expect(
        AuthService.authenticateUser(ID, 'YanlisSifre1', undefined, meta),
      ).rejects.toThrow();
    }

    const result = await AuthService.authenticateUser(ID, SIFRE, undefined, meta);
    expect(result.user.id).toBe(ID);
  });

  it('beşinci hatalı denemede hesap kilitlenir', async () => {
    const meta = { ip: '10.0.0.2', userAgent: 'test' };

    for (let i = 0; i < 5; i++) {
      await expect(
        AuthService.authenticateUser(ID, 'YanlisSifre1', undefined, meta),
      ).rejects.toThrow();
    }

    const user = await User.findOne({ id: ID });
    expect(user?.failedLoginAttempts).toBeGreaterThanOrEqual(5);
    expect(user?.lockUntil?.getTime()).toBeGreaterThan(Date.now());
  });

  it('başarılı girişten sonra hatalı deneme sayacı sıfırlanır', async () => {
    const meta = { ip: '10.0.0.3', userAgent: 'test' };

    await expect(
      AuthService.authenticateUser(ID, 'YanlisSifre1', undefined, meta),
    ).rejects.toThrow();
    await AuthService.authenticateUser(ID, SIFRE, undefined, meta);

    const user = await User.findOne({ id: ID });
    expect(user?.failedLoginAttempts).toBe(0);
  });
});
