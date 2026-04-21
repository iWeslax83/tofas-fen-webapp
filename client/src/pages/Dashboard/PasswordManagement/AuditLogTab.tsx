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

  if (isLoading) return <p>Yükleniyor...</p>;
  if (!data) return null;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="px-3 py-1.5 border rounded"
        >
          <option value="">Tüm aksiyonlar</option>
          <option value="bulk_import">Toplu İçe Aktar</option>
          <option value="admin_generated">Admin Üretimi</option>
          <option value="admin_reset">Admin Reset</option>
        </select>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="px-3 py-1.5 border rounded"
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
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2 border-b">Zaman</th>
            <th className="text-left px-3 py-2 border-b">Kullanıcı</th>
            <th className="text-left px-3 py-2 border-b">Admin</th>
            <th className="text-left px-3 py-2 border-b">Aksiyon</th>
            <th className="text-left px-3 py-2 border-b">Sebep</th>
            <th className="text-left px-3 py-2 border-b">Not</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((it) => (
            <tr key={it._id} className="border-b hover:bg-gray-50">
              <td className="px-3 py-2">{new Date(it.createdAt).toLocaleString('tr-TR')}</td>
              <td className="px-3 py-2">
                {it.userSnapshot.adSoyad}{' '}
                <span className="text-xs text-gray-500">({it.userId})</span>
              </td>
              <td className="px-3 py-2">{it.adminSnapshot.adSoyad}</td>
              <td className="px-3 py-2">{it.action}</td>
              <td className="px-3 py-2">{it.reason}</td>
              <td className="px-3 py-2">{it.reasonNote ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2 items-center">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Önceki
        </button>
        <span className="text-sm">
          Sayfa {page} / {Math.max(1, Math.ceil(data.total / data.limit))}
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page * data.limit >= data.total}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Sonraki
        </button>
      </div>
    </div>
  );
}
