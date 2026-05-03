import { useState } from 'react';

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

export default function ResetReasonModal({
  userLabel,
  onConfirm,
  onCancel,
}: ResetReasonModalProps) {
  const [reason, setReason] = useState('forgot');
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[var(--paper)] border border-[var(--rule)] rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold mb-2 text-[var(--ink)]">Şifre sıfırlama sebebi</h2>
        <p className="text-sm text-[var(--ink-dim)] mb-4">{userLabel}</p>
        <label className="block text-sm font-medium mb-1 text-[var(--ink)]">Sebep</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full border border-[var(--rule)] rounded px-3 py-2 mb-3 bg-[var(--paper)] text-[var(--ink)]"
        >
          {RESET_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {reason === 'other' && (
          <>
            <label className="block text-sm font-medium mb-1 text-[var(--ink)]">Açıklama</label>
            <textarea
              value={note}
              maxLength={280}
              rows={3}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border border-[var(--rule)] rounded px-3 py-2 mb-3 bg-[var(--paper)] text-[var(--ink)]"
              placeholder="En fazla 280 karakter"
            />
          </>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-[var(--rule)] rounded text-[var(--ink)] hover:bg-[var(--surface)]"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason, reason === 'other' ? note : undefined)}
            disabled={reason === 'other' && !note.trim()}
            className="flex-1 px-4 py-2 bg-[var(--state)] text-white rounded hover:bg-[var(--state-deep)] disabled:opacity-50"
          >
            Sıfırla
          </button>
        </div>
      </div>
    </div>
  );
}
