import { useState } from 'react';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '../../contexts/AuthContext';
import { SecureAPI } from '../../utils/api';
import { API_ENDPOINTS } from '../../utils/apiEndpoints';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordStrengthMeter } from '../../components/ui/PasswordStrengthMeter';
import { safeConsoleError } from '../../utils/safeLogger';

function hataMesaji(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const durum = error.response?.status;
    if (durum === 401) return 'Mevcut şifren yanlış.';
    if (durum === 429) return 'Çok fazla deneme yaptın, biraz bekle.';
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
  }
  return 'Şifre değiştirilemedi, tekrar dene.';
}

export default function ChangePasswordSection() {
  const { user, checkAuth } = useAuthContext();
  const [mevcut, setMevcut] = useState('');
  const [yeni, setYeni] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [goster, setGoster] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const kisaligiTamam = yeni.length >= 6;
  const eslesiyor = yeni.length > 0 && yeni === tekrar;
  const kaydedilebilir = mevcut.length > 0 && kisaligiTamam && eslesiyor && !kaydediliyor;

  const kaydet = async () => {
    if (!kaydedilebilir) return;
    setKaydediliyor(true);
    try {
      await SecureAPI.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        currentPassword: mevcut,
        newPassword: yeni,
      });
      setMevcut('');
      setYeni('');
      setTekrar('');
      toast.success('Şifren güncellendi.');
      await checkAuth();
    } catch (error) {
      safeConsoleError('change password failed', error);
      toast.error(hataMesaji(error));
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[var(--ink-dim)]">
        En az 6 karakter. Aşağıdaki gösterge sadece bilgi verir, seçimini engellemez.
      </p>

      <Input
        type={goster ? 'text' : 'password'}
        value={mevcut}
        onChange={(e) => setMevcut(e.target.value)}
        placeholder="Mevcut şifren"
        autoComplete="current-password"
      />

      <div>
        <Input
          type={goster ? 'text' : 'password'}
          value={yeni}
          onChange={(e) => setYeni(e.target.value)}
          placeholder="Yeni şifren"
          autoComplete="new-password"
        />
        <PasswordStrengthMeter
          password={yeni}
          userHints={[user?.id ?? '', user?.adSoyad ?? ''].filter(Boolean)}
        />
      </div>

      <Input
        type={goster ? 'text' : 'password'}
        value={tekrar}
        onChange={(e) => setTekrar(e.target.value)}
        placeholder="Yeni şifren (tekrar)"
        autoComplete="new-password"
      />

      {tekrar.length > 0 && !eslesiyor && (
        <p className="text-xs" style={{ color: 'var(--accent)' }}>
          İki şifre aynı değil.
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setGoster((v) => !v)}
          className="flex items-center gap-2 text-xs text-[var(--ink-dim)]"
        >
          {goster ? <EyeOff size={14} /> : <Eye size={14} />}
          {goster ? 'Şifreleri gizle' : 'Şifreleri göster'}
        </button>

        <Button onClick={kaydet} disabled={!kaydedilebilir}>
          {kaydediliyor ? 'Kaydediliyor...' : 'Şifreyi değiştir'}
        </Button>
      </div>
    </div>
  );
}
