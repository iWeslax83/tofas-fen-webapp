import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../utils/cn';

export const RESET_REASONS: Array<{ value: string; label: string }> = [
  { value: 'forgot', label: 'Kullanıcı şifresini unuttu' },
  { value: 'security', label: 'Güvenlik gereği' },
  { value: 'new_user', label: 'Yeni kullanıcı' },
  { value: 'other', label: 'Diğer' },
];

export interface ResetReasonModalProps {
  userLabel: string;
  onConfirm: (reason: string, reasonNote?: string) => void;
  onCancel: () => void;
}

const inputCls = cn(
  'w-full bg-[var(--paper)] dark:bg-[var(--surface-2)] border border-[var(--rule)] rounded-[var(--radius-sm)] px-3 py-2',
  'text-[var(--ink)] placeholder:text-[var(--ink-dim)]',
  'focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-tint)]',
  'transition-colors',
);

export default function ResetReasonModal({
  userLabel,
  onConfirm,
  onCancel,
}: ResetReasonModalProps) {
  const [reason, setReason] = useState('forgot');
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[var(--paper)] border border-[var(--rule)] rounded-[var(--radius)] shadow-[var(--shadow)] overflow-hidden max-w-md w-full">
        {/* Modal header bar */}
        <div className="bg-[var(--accent)] text-white px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-medium">Şifre Sıfırlama Sebebi</span>
          <button
            type="button"
            onClick={onCancel}
            className="text-white hover:opacity-80"
            aria-label="Kapat"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="font-mono text-xs text-[var(--ink-dim)]">{userLabel}</p>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--ink-dim)]">Sebep</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
              {RESET_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          {reason === 'other' && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--ink-dim)]">Açıklama</span>
              <textarea
                value={note}
                maxLength={280}
                rows={3}
                onChange={(e) => setNote(e.target.value)}
                className={cn(inputCls, 'resize-y min-h-[4rem]')}
                placeholder="En fazla 280 karakter"
              />
            </label>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" size="md" onClick={onCancel} className="flex-1">
              İptal
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => onConfirm(reason, reason === 'other' ? note : undefined)}
              disabled={reason === 'other' && !note.trim()}
              className="flex-1"
            >
              Sıfırla
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
