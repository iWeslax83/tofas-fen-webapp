import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Copy, Check, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

const CLIPBOARD_CLEAR_MS = 60_000;

export interface PasswordRevealModalProps {
  password: string;
  userLabel: string;
  onClose: () => void;
}

export default function PasswordRevealModal({
  password,
  userLabel,
  onClose,
}: PasswordRevealModalProps) {
  const [copied, setCopied] = useState(false);
  const [clearedAt, setClearedAt] = useState<Date | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimer.current) {
        clearTimeout(clearTimer.current);
      }
      // Clear clipboard on unmount if we wrote to it
      navigator.clipboard.writeText('').catch(() => undefined);
    };
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setClearedAt(null);

    if (clearTimer.current) {
      clearTimeout(clearTimer.current);
    }
    clearTimer.current = setTimeout(() => {
      navigator.clipboard.writeText('').catch(() => undefined);
      setClearedAt(new Date());
      setCopied(false);
    }, CLIPBOARD_CLEAR_MS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[var(--paper)] border border-[var(--rule)] max-w-md w-full">
        {/* Modal header bar */}
        <div className="bg-[var(--state)] text-white px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-medium">Şifre Üretildi</span>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:opacity-80"
            aria-label="Kapat"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-[var(--warn)] flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-[var(--ink-dim)]">
              <span className="font-medium text-[var(--ink)]">{userLabel}</span> için aşağıdaki
              şifre sadece bir kez gösterilir. Şimdi kopyalayın ve güvenli bir yerde saklayın.
            </p>
          </div>

          {/* Password display — flat, no rounded corners */}
          <div className="bg-[var(--surface)] border border-[var(--rule)] p-4 font-mono text-xl tracking-wider text-center select-all text-[var(--ink)]">
            {password}
          </div>

          <Button variant="danger" size="md" fullWidth onClick={handleCopy} type="button">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Kopyalandı' : 'Panoya kopyala'}
          </Button>

          {clearedAt && (
            <p className="text-xs font-medium text-[var(--warn)] text-center">
              Pano 60 saniye sonra temizlendi.
            </p>
          )}
          {!clearedAt && copied && (
            <p className="text-xs font-medium text-[var(--ink-dim)] text-center">
              Pano 60 saniye içinde otomatik temizlenecek.
            </p>
          )}

          <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            Şifreyi kaydettim, bu pencere kapatılabilir.
          </label>

          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={onClose}
            disabled={!acknowledged}
            type="button"
          >
            <X size={16} />
            Kapat
          </Button>
        </div>
      </div>
    </div>
  );
}
