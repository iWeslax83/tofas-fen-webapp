/**
 * Minimal SecureAPI helper for GraphQL resolvers
 * Provides a small `login` helper used by GraphQL login mutation.
 */
import { User } from '../models/User';
import bcrypt from 'bcryptjs';

export const SecureAPI = {
  async login(id: string, sifre: string) {
    if (!id || !sifre) {
      throw new Error('ID ve şifre gereklidir');
    }

    const user = await User.findOne({ id, isActive: true });
    if (!user) throw new Error('Geçersiz kimlik bilgileri');

    if (!user.sifre) throw new Error('Şifre ayarlanmamış');

    const isValid = await bcrypt.compare(sifre, user.sifre);
    if (!isValid) throw new Error('Geçersiz kimlik bilgileri');

    return {
      success: true,
      message: 'Giriş başarılı',
      user: {
        id: user.id,
        adSoyad: user.adSoyad,
        rol: user.rol,
      }
    };
  }
};

export default SecureAPI;
