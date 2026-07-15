import { useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useBulkImportPreview, useBulkImportCommit } from './hooks/useBulkImport';
import PendingBatchesList from './PendingBatchesList';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import type { BulkImportPreviewResponse } from '../../../utils/passwordAdminService';

export default function BulkImportTab() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BulkImportPreviewResponse | null>(null);
  const previewMut = useBulkImportPreview();
  const commitMut = useBulkImportCommit();

  const handlePreview = () => {
    if (!file) return;
    previewMut.mutate(file, {
      onSuccess: setPreview,
      onError: (err: unknown) =>
        toast.error(err instanceof Error ? err.message : 'Önizleme başarısız'),
    });
  };

  const handleCommit = () => {
    if (!file) return;
    commitMut.mutate(file, {
      onSuccess: (res) => {
        // N-C1 frontend: server returns downloadUrl; follow it instead of
        // decoding base64 from the JSON envelope.
        if (res.downloadUrl) {
          window.location.href = res.downloadUrl;
        }
        setFile(null);
        setPreview(null);
        toast.success(`${res.imported ?? 0} öğrenci içe aktarıldı`);
      },
      onError: (err: unknown) =>
        toast.error(err instanceof Error ? err.message : 'İçe aktarma başarısız'),
    });
  };

  return (
    <div className="space-y-6">
      <Card accentBar contentClassName="p-4">
        <div className="text-xs font-medium text-[var(--ink-dim)] mb-3">
          Tofaş Sınıf Listesi Yükle
        </div>
        <div className="flex items-center gap-3 mb-3">
          <label className="inline-flex items-center gap-2 h-8 px-3 text-sm font-medium border border-[var(--rule)] bg-transparent text-[var(--ink)] cursor-pointer hover:border-[var(--ink)] transition-colors">
            <Upload size={16} />
            <span>XLS Seç</span>
            <input
              type="file"
              accept=".xls,.xlsx"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setPreview(null);
              }}
            />
          </label>
          {file && <span className="font-mono text-xs text-[var(--ink-dim)]">{file.name}</span>}
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handlePreview}
            disabled={!file}
            loading={previewMut.isPending}
          >
            Önizle
          </Button>
          {preview && (
            <Button variant="danger" size="sm" onClick={handleCommit} loading={commitMut.isPending}>
              İçe Aktar ve Şifre Üret
            </Button>
          )}
        </div>
      </Card>

      {preview && (
        <Card contentClassName="p-4">
          <div className="text-xs font-medium text-[var(--ink-dim)] mb-2">Önizleme</div>
          <p className="text-sm text-[var(--ink-dim)]">
            Toplam: <span className="font-medium text-[var(--ink)]">{preview.total}</span>, Mevcut
            ID: <span className="font-medium text-[var(--ink)]">{preview.existingIds.length}</span>,
            Uyarı: <span className="font-medium text-[var(--ink)]">{preview.warnings.length}</span>
          </p>
          <div className="mt-3 grid grid-cols-4 gap-px bg-[var(--rule)] border border-[var(--rule)]">
            {Object.entries(preview.classDistribution).map(([k, v]) => (
              <div key={k} className="bg-[var(--surface)] p-2 text-center">
                <div className="font-serif text-sm font-medium text-[var(--ink)]">{k}</div>
                <div className="font-mono text-xs text-[var(--ink-dim)]">{v} öğrenci</div>
              </div>
            ))}
          </div>
          {preview.warnings.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs uppercase tracking-wider text-[var(--warn)] cursor-pointer">
                Uyarıları göster
              </summary>
              <ul className="text-xs mt-2 list-disc list-inside text-[var(--ink-dim)]">
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </details>
          )}
        </Card>
      )}

      <Card contentClassName="p-4">
        <div className="text-xs font-medium text-[var(--ink-dim)] mb-3">Bekleyen Yüklemeler</div>
        <PendingBatchesList />
      </Card>
    </div>
  );
}
