import { useRef } from 'react';
import { Link2, X } from 'lucide-react';
import { UserService } from '../../utils/apiService';

interface BulkLinkEntry {
  parentId: string;
  childId: string;
}

interface BulkLinkError extends BulkLinkEntry {
  message: string;
}

interface BulkLinkPreview {
  total: number;
  links?: BulkLinkEntry[];
}

interface BulkLinkResult {
  linked: number;
  errors?: BulkLinkError[];
}

export interface BulkLinkSectionProps {
  linkFile: File | null;
  setLinkFile: (file: File | null) => void;
  linkPreview: BulkLinkPreview | null;
  setLinkPreview: (preview: BulkLinkPreview | null) => void;
  linkLoading: boolean;
  setLinkLoading: (loading: boolean) => void;
  linkResult: BulkLinkResult | null;
  setLinkResult: (result: BulkLinkResult | null) => void;
  linkError: string;
  setLinkError: (error: string) => void;
  onLinkComplete: () => void;
  onClose: () => void;
}

export default function BulkLinkSection({
  linkFile,
  setLinkFile,
  linkPreview,
  setLinkPreview,
  linkLoading,
  setLinkLoading,
  linkResult,
  setLinkResult,
  linkError,
  setLinkError,
  onLinkComplete,
  onClose,
}: BulkLinkSectionProps) {
  const linkFileRef = useRef<HTMLInputElement>(null);

  const handleBulkLinkPreview = async () => {
    if (!linkFile) return;
    setLinkLoading(true);
    setLinkError('');
    setLinkPreview(null);
    try {
      const formData = new FormData();
      formData.append('file', linkFile);
      const { data, error } = await UserService.bulkLinkParentChild(formData, true);
      if (error) {
        setLinkError(error);
      } else {
        setLinkPreview(data);
      }
    } catch {
      setLinkError('Önizleme sırasında hata oluştu');
    }
    setLinkLoading(false);
  };

  const handleBulkLink = async () => {
    if (!linkFile) return;
    setLinkLoading(true);
    setLinkError('');
    setLinkResult(null);
    try {
      const formData = new FormData();
      formData.append('file', linkFile);
      const { data, error } = await UserService.bulkLinkParentChild(formData, false);
      if (error) {
        setLinkError(error);
      } else {
        setLinkResult(data);
        onLinkComplete();
      }
    } catch {
      setLinkError('Eşleştirme sırasında hata oluştu');
    }
    setLinkLoading(false);
  };

  const resetBulkLink = () => {
    setLinkFile(null);
    setLinkPreview(null);
    setLinkResult(null);
    setLinkError('');
    if (linkFileRef.current) linkFileRef.current.value = '';
  };

  return (
    <div className="bulk-import-panel">
      <h3 className="bulk-panel-title">
        <Link2 size={20} />
        Toplu Veli-Öğrenci Eşleştirme
      </h3>
      <p className="bulk-panel-desc">
        CSV veya Excel dosyası yükleyin. Beklenen sütunlar: parentId, childId
      </p>

      <div className="bulk-file-row">
        <input
          ref={linkFileRef}
          type="file"
          accept=".xlsx,.csv,.xls"
          onChange={(e) => {
            setLinkFile(e.target.files?.[0] || null);
            setLinkPreview(null);
            setLinkResult(null);
            setLinkError('');
          }}
          className="form-input bulk-file-input"
        />
        <button
          className="btn btn-secondary"
          onClick={handleBulkLinkPreview}
          disabled={!linkFile || linkLoading}
        >
          Önizle
        </button>
        <button
          className="btn btn-warning"
          onClick={handleBulkLink}
          disabled={!linkFile || linkLoading}
        >
          {linkLoading ? 'İşleniyor...' : 'Eşleştir'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => {
            resetBulkLink();
            onClose();
          }}
        >
          <X size={14} /> Kapat
        </button>
      </div>

      {linkError && <div className="bulk-error">{linkError}</div>}

      {linkPreview && (
        <div className="result-section">
          <h4>Önizleme: {linkPreview.total} eşleştirme bulundu</h4>
          {linkPreview.links && linkPreview.links.length > 0 && (
            <div className="preview-table-wrapper">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Veli ID</th>
                    <th>Öğrenci ID</th>
                  </tr>
                </thead>
                <tbody>
                  {linkPreview.links.slice(0, 20).map((l: BulkLinkEntry, i: number) => (
                    <tr key={i}>
                      <td>{l.parentId}</td>
                      <td>{l.childId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {linkPreview.links.length > 20 && (
                <p className="preview-more">
                  ...ve {linkPreview.links.length - 20} eşleştirme daha
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {linkResult && (
        <div className="result-section">
          <h4>Eşleştirme Sonucu</h4>
          <p className="bulk-success">{linkResult.linked} eşleştirme başarıyla yapıldı.</p>
          {linkResult.errors && linkResult.errors.length > 0 && (
            <div className="bulk-error">
              {linkResult.errors.length} hata:{' '}
              {linkResult.errors
                .slice(0, 5)
                .map((e: BulkLinkError) => `${e.parentId}-${e.childId}: ${e.message}`)
                .join('; ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
