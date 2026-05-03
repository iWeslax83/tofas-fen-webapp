import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Copy, Check, X } from 'lucide-react';

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
      <div className="bg-[var(--paper)] border border-[var(--rule)] rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="text-[var(--warn)] flex-shrink-0 mt-0.5" size={24} />
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink)]">Şifre üretildi</h2>
            <p className="text-sm text-[var(--ink-dim)]">
              <span className="font-medium text-[var(--ink)]">{userLabel}</span> için aşağıdaki
              şifre sadece bir kez gösterilir. Şimdi kopyalayın ve güvenli bir yerde saklayın.
            </p>
          </div>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--rule)] rounded p-4 mb-4 font-mono text-xl tracking-wider text-center select-all text-[var(--ink)]">
          {password}
        </div>
        <button
          onClick={handleCopy}
          className="w-full mb-1 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--state)] text-white rounded hover:bg-[var(--state-deep)] transition"
          type="button"
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? 'Kopyalandı' : 'Panoya kopyala'}
        </button>
        {clearedAt && (
          <p className="text-xs text-[var(--warn)] mb-2 text-center">
            Pano 60 saniye sonra temizlendi.
          </p>
        )}
        {!clearedAt && copied && (
          <p className="text-xs text-[var(--ink-dim)] mb-2 text-center">
            Pano 60 saniye içinde otomatik temizlenecek.
          </p>
        )}
        {!copied && !clearedAt && <div className="mb-3" />}
        <label className="flex items-center gap-2 text-sm text-[var(--ink)] mb-3">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
          Şifreyi kaydettim, bu pencere kapatılabilir.
        </label>
        <button
          onClick={onClose}
          disabled={!acknowledged}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--ink)] text-[var(--paper)] rounded hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
        >
          <X size={18} />
          Kapat
        </button>
      </div>
    </div>
  );
}
