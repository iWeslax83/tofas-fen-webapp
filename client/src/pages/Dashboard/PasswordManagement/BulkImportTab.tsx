import { useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useBulkImportPreview, useBulkImportCommit } from './hooks/useBulkImport';
import PendingBatchesList from './PendingBatchesList';
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
      <section className="bg-[var(--paper)] border border-[var(--rule)] rounded p-4">
        <h3 className="text-lg font-semibold mb-3 text-[var(--ink)]">Tofaş Sınıf Listesi Yükle</h3>
        <div className="flex items-center gap-3 mb-3">
          <label className="flex items-center gap-2 px-4 py-2 border border-[var(--rule)] rounded cursor-pointer hover:bg-[var(--surface)]">
            <Upload size={18} />
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
          {file && <span className="text-sm text-[var(--ink-dim)]">{file.name}</span>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePreview}
            disabled={!file || previewMut.isPending}
            className="px-4 py-2 bg-[var(--ink)] text-[var(--paper)] rounded hover:opacity-90 disabled:opacity-50"
          >
            {previewMut.isPending ? 'Yükleniyor...' : 'Önizle'}
          </button>
          {preview && (
            <button
              onClick={handleCommit}
              disabled={commitMut.isPending}
              className="px-4 py-2 bg-[var(--state)] text-white rounded hover:bg-[var(--state-deep)] disabled:opacity-50"
            >
              {commitMut.isPending ? 'İçe aktarılıyor...' : 'İçe Aktar ve Şifre Üret'}
            </button>
          )}
        </div>
      </section>

      {preview && (
        <section className="bg-[var(--paper)] border border-[var(--rule)] rounded p-4">
          <h3 className="text-lg font-semibold mb-2 text-[var(--ink)]">Önizleme</h3>
          <p className="text-sm text-[var(--ink-dim)]">
            Toplam: <span className="font-semibold">{preview.total}</span>, Mevcut ID:{' '}
            <span className="font-semibold">{preview.existingIds.length}</span>, Uyarı:{' '}
            <span className="font-semibold">{preview.warnings.length}</span>
          </p>
          <div className="mt-2 grid grid-cols-4 gap-2 text-sm">
            {Object.entries(preview.classDistribution).map(([k, v]) => (
              <div key={k} className="bg-[var(--surface)] rounded p-2 text-center">
                <div className="font-semibold text-[var(--ink)]">{k}</div>
                <div className="text-xs text-[var(--ink-dim)]">{v} öğrenci</div>
              </div>
            ))}
          </div>
          {preview.warnings.length > 0 && (
            <details className="mt-3">
              <summary className="text-sm text-[var(--warn)] cursor-pointer">
                Uyarıları göster
              </summary>
              <ul className="text-xs mt-2 list-disc list-inside text-[var(--ink-dim)]">
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      <section className="bg-[var(--paper)] border border-[var(--rule)] rounded p-4">
        <h3 className="text-lg font-semibold mb-3 text-[var(--ink)]">Bekleyen Batch'ler</h3>
        <PendingBatchesList />
      </section>
    </div>
  );
}
