import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { SecureAPI } from '../utils/api';
import { API_ENDPOINTS } from '../utils/apiEndpoints';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PasswordStrengthMeter } from '../components/ui/PasswordStrengthMeter';

function hataMesaji(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const durum = error.response?.status;
    const govde = error.response?.data as { error?: string; message?: string } | undefined;
    const sunucu = govde?.error ?? govde?.message ?? '';

    if (durum === 400 && /süresi dolmuş|geçersiz/i.test(sunucu)) {
      return 'Bu bağlantının süresi dolmuş ya da daha önce kullanılmış. Giriş ekranındaki "Şifremi unuttum" ile yeni bir bağlantı isteyebilirsin.';
    }
    if (durum === 429) {
      return 'Çok fazla deneme yapıldı. Birkaç dakika bekleyip tekrar dene.';
    }
    if (sunucu) return sunucu;
  }
  return 'Şifre belirlenemedi. İnternet bağlantını kontrol edip tekrar dene.';
}

/**
 * Kayıt başvurusu onaylanan kullanıcıya giden "Şifremi Belirle" bağlantısının
 * ve "şifremi unuttum" akışının indiği sayfa. İkisi de aynı tek kullanımlık
 * token'ı taşıyor, sunucu tarafı POST /api/auth/reset-password.
 */
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = params.get('token') ?? '';
  const id = params.get('id') ?? '';
  const baglantiGecerli = token.length > 0 && id.length > 0;

  const [yeni, setYeni] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [goster, setGoster] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState('');

  const kisaligiTamam = yeni.length >= 6;
  const eslesiyor = yeni.length > 0 && yeni === tekrar;

  const kaydet = async () => {
    setHata('');

    if (!kisaligiTamam) {
      setHata('Şifre en az 6 karakter olmalı.');
      return;
    }
    if (!eslesiyor) {
      setHata('İki şifre aynı değil.');
      return;
    }

    setKaydediliyor(true);
    try {
      await SecureAPI.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        id,
        token,
        newPassword: yeni,
      });
      toast.success('Şifren belirlendi. Şimdi giriş yapabilirsin.');
      navigate('/login', { replace: true });
    } catch (error) {
      setHata(hataMesaji(error));
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--paper)]">
      <div className="h-1.5 bg-[var(--accent)]" aria-hidden="true" />

      <main className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md border border-[var(--rule)] rounded-[var(--radius)] p-8 lg:p-10">
          <div className="flex flex-col items-center gap-4 pb-6 border-b border-[var(--rule)]">
            <img
              src="/tofaslogo.png"
              alt="Tofaş Fen Lisesi logosu"
              width={250}
              height={298}
              className="h-20 w-auto"
            />
            <div className="text-center">
              <span className="block font-serif text-lg text-[var(--ink)] leading-tight">
                Tofaş Fen Lisesi
              </span>
              <span className="block text-xs text-[var(--ink-dim)]">Bilgi Sistemi</span>
            </div>
          </div>

          <header className="mt-6 mb-6">
            <h1 className="font-serif text-2xl text-[var(--ink)]">Şifreni belirle</h1>
            <p className="mt-1 text-sm text-[var(--ink-dim)] leading-relaxed">
              {baglantiGecerli
                ? 'Hesabını kullanmaya başlamak için kendine bir şifre seç. En az 6 karakter.'
                : 'Bu sayfaya e-postandaki bağlantıyla gelmen gerekiyor.'}
            </p>
          </header>

          {!baglantiGecerli ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-[var(--ink-2)] leading-relaxed">
                Bağlantı eksik veya bozuk görünüyor. E-postadaki bağlantıyı kopyalayıp
                yapıştırdıysan adresin tamamını aldığından emin ol. Bağlantının süresi 1 saat.
              </p>
              <Link
                to="/login"
                className="text-sm text-[var(--accent)] underline underline-offset-4"
              >
                Giriş ekranına dön
              </Link>
            </div>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!kaydediliyor) kaydet();
              }}
            >
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--ink-2)]">Yeni şifre</span>
                <Input
                  type={goster ? 'text' : 'password'}
                  value={yeni}
                  onChange={(e) => setYeni(e.target.value)}
                  autoComplete="new-password"
                  maxLength={100}
                  disabled={kaydediliyor}
                />
              </label>

              <PasswordStrengthMeter password={yeni} userHints={[id]} />

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--ink-2)]">Yeni şifre (tekrar)</span>
                <Input
                  type={goster ? 'text' : 'password'}
                  value={tekrar}
                  onChange={(e) => setTekrar(e.target.value)}
                  autoComplete="new-password"
                  maxLength={100}
                  disabled={kaydediliyor}
                />
              </label>

              {hata && (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--accent)' }}>
                  {hata}
                </p>
              )}

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setGoster((v) => !v)}
                  className="flex items-center gap-2 text-xs text-[var(--ink-dim)]"
                >
                  {goster ? <EyeOff size={14} /> : <Eye size={14} />}
                  {goster ? 'Şifreleri gizle' : 'Şifreleri göster'}
                </button>

                <Button type="submit" disabled={kaydediliyor}>
                  {kaydediliyor ? 'Kaydediliyor...' : 'Şifreyi belirle'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
