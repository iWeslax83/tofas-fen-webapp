import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { LoadBar } from '../../../components/SkeletonComponents';
import {
  DocumentTable,
  DocumentTableBody,
  DocumentTableCell,
  DocumentTableHead,
  DocumentTableHeader,
  DocumentTableRow,
} from '../../../components/ui/DocumentTable';
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
    'h-8 px-3 rounded-[var(--radius-sm)] text-xs font-mono border border-[var(--rule)] bg-[var(--paper)] dark:bg-[var(--surface-2)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-tint)]';

  if (isLoading)
    return (
      <div className="max-w-xs">
        <LoadBar />
      </div>
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

      <div className="rounded-[var(--radius)] border border-[var(--rule)] overflow-hidden">
        <DocumentTable>
          <DocumentTableHeader>
            <DocumentTableRow>
              <DocumentTableHead>Zaman</DocumentTableHead>
              <DocumentTableHead>Kullanıcı</DocumentTableHead>
              <DocumentTableHead>Admin</DocumentTableHead>
              <DocumentTableHead>Aksiyon</DocumentTableHead>
              <DocumentTableHead>Sebep</DocumentTableHead>
              <DocumentTableHead>Not</DocumentTableHead>
            </DocumentTableRow>
          </DocumentTableHeader>
          <DocumentTableBody>
            {data.items.map((it) => (
              <DocumentTableRow key={it._id}>
                <DocumentTableCell className="font-mono text-xs">
                  {new Date(it.createdAt).toLocaleString('tr-TR')}
                </DocumentTableCell>
                <DocumentTableCell className="text-[var(--ink)]">
                  <span className="font-serif">{it.userSnapshot.adSoyad}</span>{' '}
                  <span className="font-mono text-xs text-[var(--ink-dim)]">({it.userId})</span>
                </DocumentTableCell>
                <DocumentTableCell className="font-serif text-[var(--ink)]">
                  {it.adminSnapshot.adSoyad}
                </DocumentTableCell>
                <DocumentTableCell className="font-mono text-xs">{it.action}</DocumentTableCell>
                <DocumentTableCell className="font-mono text-xs">{it.reason}</DocumentTableCell>
                <DocumentTableCell className="font-serif text-[var(--ink-dim)]">
                  {it.reasonNote ?? '—'}
                </DocumentTableCell>
              </DocumentTableRow>
            ))}
          </DocumentTableBody>
        </DocumentTable>
      </div>

      <div className="flex gap-2 items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Önceki
        </Button>
        <span className="text-xs font-medium text-[var(--ink-dim)]">
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
