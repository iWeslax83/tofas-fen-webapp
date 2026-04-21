import { useEffect, useState } from 'react';
import { AlertTriangle, Copy, Check, X } from 'lucide-react';

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
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    return () => {
      setCopied(false);
      setAcknowledged(false);
    };
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={24} />
          <div>
            <h2 className="text-lg font-semibold">Şifre üretildi</h2>
            <p className="text-sm text-gray-600">
              <span className="font-medium">{userLabel}</span> için aşağıdaki şifre sadece bir kez
              gösterilir. Şimdi kopyalayın ve güvenli bir yerde saklayın.
            </p>
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-4 font-mono text-xl tracking-wider text-center select-all">
          {password}
        </div>
        <button
          onClick={handleCopy}
          className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          type="button"
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? 'Kopyalandı' : 'Panoya kopyala'}
        </button>
        <label className="flex items-center gap-2 text-sm text-gray-700 mb-3">
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
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
        >
          <X size={18} />
          Kapat
        </button>
      </div>
    </div>
  );
}
