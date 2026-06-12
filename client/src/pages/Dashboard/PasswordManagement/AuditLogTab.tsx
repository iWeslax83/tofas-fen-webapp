import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { useAuditLog } from './hooks/useAuditLog';

export default function AuditLogTab() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const { data, isLoading } = useAuditLog({
    page,
    limit: 20,
    action: action || undefined,
    reason: reason || undefined,
  });

  const selectCls =
    'h-8 px-3 text-xs font-mono border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--state)]';

  if (isLoading)
    return (
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
        Yükleniyor...
      </p>
    );
  if (!data) return null;

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <select value={action} onChange={(e) => setAction(e.target.value)} className={selectCls}>
          <option value="">Tüm aksiyonlar</option>
          <option value="bulk_import">Toplu İçe Aktar</option>
          <option value="admin_generated">Admin Üretimi</option>
          <option value="admin_reset">Admin Reset</option>
        </select>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className={selectCls}>
          <option value="">Tüm sebepler</option>
          <option value="forgot">Unuttu</option>
          <option value="security">Güvenlik</option>
          <option value="new_user">Yeni kullanıcı</option>
          <option value="bulk_import">Toplu İçe Aktar</option>
          <option value="other">Diğer</option>
        </select>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead className="bg-[var(--surface)]">
          <tr>
            {['Zaman', 'Kullanıcı', 'Admin', 'Aksiyon', 'Sebep', 'Not'].map((h) => (
              <th
                key={h}
                className="text-left px-3 py-2 border-b border-[var(--rule)] font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.items.map((it) => (
            <tr key={it._id} className="border-b border-[var(--rule)] hover:bg-[var(--surface)]">
              <td className="px-3 py-2 font-mono text-xs text-[var(--ink-dim)]">
                {new Date(it.createdAt).toLocaleString('tr-TR')}
              </td>
              <td className="px-3 py-2 text-[var(--ink)]">
                <span className="font-serif">{it.userSnapshot.adSoyad}</span>{' '}
                <span className="font-mono text-xs text-[var(--ink-dim)]">({it.userId})</span>
              </td>
              <td className="px-3 py-2 font-serif text-[var(--ink)]">{it.adminSnapshot.adSoyad}</td>
              <td className="px-3 py-2 font-mono text-xs text-[var(--ink-dim)]">{it.action}</td>
              <td className="px-3 py-2 font-mono text-xs text-[var(--ink-dim)]">{it.reason}</td>
              <td className="px-3 py-2 font-serif text-[var(--ink-dim)]">{it.reasonNote ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-2 items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Önceki
        </Button>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
          Sayfa {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={page * data.limit >= data.total}
        >
          Sonraki
        </Button>
      </div>
    </div>
  );
}
