import { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { UserService } from '../../utils/apiService';

interface BulkPreviewError {
  row: number;
  message: string;
}

interface BulkPreviewRow {
  id: string;
  adSoyad: string;
  rol: string;
  sinif?: string;
  sube?: string;
}

interface BulkImportPreview {
  valid: number;
  total: number;
  errors?: BulkPreviewError[];
  rows?: BulkPreviewRow[];
}

interface BulkImportResult {
  imported: number;
  failed: number;
  duplicates?: string[];
}

export interface BulkUserImportSectionProps {
  bulkFile: File | null;
  setBulkFile: (file: File | null) => void;
  bulkPreview: BulkImportPreview | null;
  setBulkPreview: (preview: BulkImportPreview | null) => void;
  bulkLoading: boolean;
  setBulkLoading: (loading: boolean) => void;
  bulkResult: BulkImportResult | null;
  setBulkResult: (result: BulkImportResult | null) => void;
  bulkError: string;
  setBulkError: (error: string) => void;
  onImportComplete: () => void;
  onClose: () => void;
}

export default function BulkUserImportSection({
  bulkFile,
  setBulkFile,
  bulkPreview,
  setBulkPreview,
  bulkLoading,
  setBulkLoading,
  bulkResult,
  setBulkResult,
  bulkError,
  setBulkError,
  onImportComplete,
  onClose,
}: BulkUserImportSectionProps) {
  const bulkFileRef = useRef<HTMLInputElement>(null);

  const handleBulkPreview = async () => {
    if (!bulkFile) return;
    setBulkLoading(true);
    setBulkError('');
    setBulkPreview(null);
    try {
      const formData = new FormData();
      formData.append('file', bulkFile);
      const { data, error } = await UserService.bulkImportUsers(formData, true);
      if (error) {
        setBulkError(error);
      } else {
        setBulkPreview(data);
      }
    } catch {
      setBulkError('Önizleme sırasında hata oluştu');
    }
    setBulkLoading(false);
  };

  const handleBulkImport = async () => {
    if (!bulkFile) return;
    setBulkLoading(true);
    setBulkError('');
    setBulkResult(null);
    try {
      const formData = new FormData();
      formData.append('file', bulkFile);
      const { data, error } = await UserService.bulkImportUsers(formData, false);
      if (error) {
        setBulkError(error);
      } else {
        setBulkResult(data);
        onImportComplete();
      }
    } catch {
      setBulkError('Aktarım sırasında hata oluştu');
    }
    setBulkLoading(false);
  };

  const resetBulkImport = () => {
    setBulkFile(null);
    setBulkPreview(null);
    setBulkResult(null);
    setBulkError('');
    if (bulkFileRef.current) bulkFileRef.current.value = '';
  };

  return (
    <div className="bulk-import-panel">
      <h3 className="bulk-panel-title">
        <Upload size={20} />
        Toplu Kullanıcı Aktarımı
      </h3>
      <p className="bulk-panel-desc">
        Excel (.xlsx) veya CSV dosyası yükleyin. Beklenen sütunlar: id, adSoyad, rol, sinif, sube,
        sifre (opsiyonel: parentId, oda, pansiyon, tckn)
      </p>

      <div className="bulk-file-row">
        <input
          ref={bulkFileRef}
          type="file"
          accept=".xlsx,.csv,.xls"
          onChange={(e) => {
            setBulkFile(e.target.files?.[0] || null);
            setBulkPreview(null);
            setBulkResult(null);
            setBulkError('');
          }}
          className="form-input bulk-file-input"
        />
        <button
          className="btn btn-secondary"
          onClick={handleBulkPreview}
          disabled={!bulkFile || bulkLoading}
        >
          Önizle
        </button>
        <button
          className="btn btn-success"
          onClick={handleBulkImport}
          disabled={!bulkFile || bulkLoading}
        >
          {bulkLoading ? 'İşleniyor...' : 'Aktar'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => {
            resetBulkImport();
            onClose();
          }}
        >
          <X size={14} /> Kapat
        </button>
      </div>

      {bulkError && <div className="bulk-error">{bulkError}</div>}

      {bulkPreview && (
        <div className="result-section">
          <h4>
            Önizleme: {bulkPreview.valid} geçerli / {bulkPreview.total} toplam
          </h4>
          {bulkPreview.errors && bulkPreview.errors.length > 0 && (
            <div className="bulk-error">
              {bulkPreview.errors.length} hata:{' '}
              {bulkPreview.errors
                .slice(0, 5)
                .map((e: BulkPreviewError) => `Satır ${e.row}: ${e.message}`)
                .join('; ')}
              {bulkPreview.errors.length > 5 && ` ...ve ${bulkPreview.errors.length - 5} daha`}
            </div>
          )}
          {bulkPreview.rows && bulkPreview.rows.length > 0 && (
            <div className="preview-table-wrapper">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Ad Soyad</th>
                    <th>Rol</th>
                    <th>Sınıf</th>
                    <th>Şube</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkPreview.rows.slice(0, 20).map((r: BulkPreviewRow, i: number) => (
                    <tr key={i}>
                      <td>{r.id}</td>
                      <td>{r.adSoyad}</td>
                      <td>{r.rol}</td>
                      <td>{r.sinif || '-'}</td>
                      <td>{r.sube || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bulkPreview.rows.length > 20 && (
                <p className="preview-more">...ve {bulkPreview.rows.length - 20} satır daha</p>
              )}
            </div>
          )}
        </div>
      )}

      {bulkResult && (
        <div className="result-section">
          <h4>Aktarım Sonucu</h4>
          <p className="bulk-success">{bulkResult.imported} kullanıcı başarıyla eklendi.</p>
          {bulkResult.failed > 0 && (
            <p className="bulk-error">{bulkResult.failed} kullanıcı eklenemedi.</p>
          )}
          {bulkResult.duplicates && bulkResult.duplicates.length > 0 && (
            <p className="bulk-warning">Tekrarlanan ID'ler: {bulkResult.duplicates.join(', ')}</p>
          )}
        </div>
      )}
    </div>
  );
}
