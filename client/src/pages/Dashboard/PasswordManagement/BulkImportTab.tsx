import { useState } from 'react';
import { Upload } from 'lucide-react';
import { useBulkImportPreview, useBulkImportCommit } from './hooks/useBulkImport';
import PendingBatchesList from './PendingBatchesList';
import { downloadBase64File } from './downloadBase64';
import type { BulkImportPreviewResponse } from '../../../utils/passwordAdminService';

export default function BulkImportTab() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BulkImportPreviewResponse | null>(null);
  const previewMut = useBulkImportPreview();
  const commitMut = useBulkImportCommit();

  const handlePreview = () => {
    if (!file) return;
    previewMut.mutate(file, { onSuccess: setPreview });
  };

  const handleCommit = () => {
    if (!file) return;
    commitMut.mutate(file, {
      onSuccess: (res) => {
        downloadBase64File(res.credentialsFileBase64, res.credentialsFilename);
        setFile(null);
        setPreview(null);
      },
    });
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border rounded p-4">
        <h3 className="text-lg font-semibold mb-3">Tofaş Sınıf Listesi Yükle</h3>
        <div className="flex items-center gap-3 mb-3">
          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
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
          {file && <span className="text-sm text-gray-700">{file.name}</span>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePreview}
            disabled={!file || previewMut.isPending}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 disabled:opacity-50"
          >
            {previewMut.isPending ? 'Yükleniyor...' : 'Önizle'}
          </button>
          {preview && (
            <button
              onClick={handleCommit}
              disabled={commitMut.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {commitMut.isPending ? 'İçe aktarılıyor...' : 'İçe Aktar ve Şifre Üret'}
            </button>
          )}
        </div>
      </section>

      {preview && (
        <section className="bg-white border rounded p-4">
          <h3 className="text-lg font-semibold mb-2">Önizleme</h3>
          <p className="text-sm">
            Toplam: <span className="font-semibold">{preview.total}</span>, Mevcut ID:{' '}
            <span className="font-semibold">{preview.existingIds.length}</span>, Uyarı:{' '}
            <span className="font-semibold">{preview.warnings.length}</span>
          </p>
          <div className="mt-2 grid grid-cols-4 gap-2 text-sm">
            {Object.entries(preview.classDistribution).map(([k, v]) => (
              <div key={k} className="bg-gray-50 rounded p-2 text-center">
                <div className="font-semibold">{k}</div>
                <div className="text-xs text-gray-600">{v} öğrenci</div>
              </div>
            ))}
          </div>
          {preview.warnings.length > 0 && (
            <details className="mt-3">
              <summary className="text-sm text-amber-700 cursor-pointer">Uyarıları göster</summary>
              <ul className="text-xs mt-2 list-disc list-inside">
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      <section className="bg-white border rounded p-4">
        <h3 className="text-lg font-semibold mb-3">Bekleyen Batch'ler</h3>
        <PendingBatchesList />
      </section>
    </div>
  );
}
