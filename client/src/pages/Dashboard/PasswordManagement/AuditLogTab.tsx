import { useState } from 'react';
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

  if (isLoading) return <p className="text-[var(--ink-dim)]">Yükleniyor...</p>;
  if (!data) return null;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="px-3 py-1.5 border border-[var(--rule)] rounded bg-[var(--paper)] text-[var(--ink)]"
        >
          <option value="">Tüm aksiyonlar</option>
          <option value="bulk_import">Toplu İçe Aktar</option>
          <option value="admin_generated">Admin Üretimi</option>
          <option value="admin_reset">Admin Reset</option>
        </select>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="px-3 py-1.5 border border-[var(--rule)] rounded bg-[var(--paper)] text-[var(--ink)]"
        >
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
            <th className="text-left px-3 py-2 border-b border-[var(--rule)] text-[var(--ink)]">
              Zaman
            </th>
            <th className="text-left px-3 py-2 border-b border-[var(--rule)] text-[var(--ink)]">
              Kullanıcı
            </th>
            <th className="text-left px-3 py-2 border-b border-[var(--rule)] text-[var(--ink)]">
              Admin
            </th>
            <th className="text-left px-3 py-2 border-b border-[var(--rule)] text-[var(--ink)]">
              Aksiyon
            </th>
            <th className="text-left px-3 py-2 border-b border-[var(--rule)] text-[var(--ink)]">
              Sebep
            </th>
            <th className="text-left px-3 py-2 border-b border-[var(--rule)] text-[var(--ink)]">
              Not
            </th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((it) => (
            <tr key={it._id} className="border-b border-[var(--rule)] hover:bg-[var(--surface)]">
              <td className="px-3 py-2 text-[var(--ink)]">
                {new Date(it.createdAt).toLocaleString('tr-TR')}
              </td>
              <td className="px-3 py-2 text-[var(--ink)]">
                {it.userSnapshot.adSoyad}{' '}
                <span className="text-xs text-[var(--ink-dim)]">({it.userId})</span>
              </td>
              <td className="px-3 py-2 text-[var(--ink)]">{it.adminSnapshot.adSoyad}</td>
              <td className="px-3 py-2 text-[var(--ink)]">{it.action}</td>
              <td className="px-3 py-2 text-[var(--ink)]">{it.reason}</td>
              <td className="px-3 py-2 text-[var(--ink)]">{it.reasonNote ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2 items-center">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-3 py-1 border border-[var(--rule)] rounded text-[var(--ink)] hover:bg-[var(--surface)] disabled:opacity-50"
        >
          Önceki
        </button>
        <span className="text-sm text-[var(--ink-dim)]">
          Sayfa {page} / {Math.max(1, Math.ceil(data.total / data.limit))}
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page * data.limit >= data.total}
          className="px-3 py-1 border border-[var(--rule)] rounded text-[var(--ink)] hover:bg-[var(--surface)] disabled:opacity-50"
        >
          Sonraki
        </button>
      </div>
    </div>
  );
}
