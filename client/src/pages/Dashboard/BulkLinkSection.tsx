import { Link2, X, Check, AlertCircle } from 'lucide-react';
import { UserService } from '../../utils/apiService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FilePickerButton } from '../../components/ui/FilePickerButton';
import {
  DocumentTable,
  DocumentTableBody,
  DocumentTableCell,
  DocumentTableHead,
  DocumentTableHeader,
  DocumentTableRow,
} from '../../components/ui/DocumentTable';

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
        setLinkPreview(data as BulkLinkPreview);
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
        setLinkResult(data as BulkLinkResult);
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
  };

  return (
    <Card accentBar contentClassName="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg text-[var(--ink)] flex items-center gap-2">
            <Link2 size={18} className="text-[var(--ink-dim)]" />
            Toplu Veli-Öğrenci Eşleştirme
          </h3>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            CSV veya Excel dosyası yükleyin. Beklenen sütunlar: parentId, childId
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetBulkLink();
            onClose();
          }}
          aria-label="Kapat"
          className="text-[var(--ink-dim)] hover:text-[var(--ink)] p-1 shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <FilePickerButton
          file={linkFile}
          onFileSelected={(file) => {
            setLinkFile(file);
            setLinkPreview(null);
            setLinkResult(null);
            setLinkError('');
          }}
          accept=".xlsx,.csv,.xls"
          hint="CSV, XLS, XLSX"
          label="Dosya Seç"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleBulkLinkPreview}
          disabled={!linkFile || linkLoading}
        >
          Önizle
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleBulkLink}
          disabled={!linkFile || linkLoading}
          loading={linkLoading}
        >
          Eşleştir
        </Button>
      </div>

      {linkError && (
        <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border-l-4 border-[var(--accent)] bg-[var(--accent-tint)] px-3 py-2 text-sm text-[var(--accent)]">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {linkError}
        </div>
      )}

      {linkPreview && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-[var(--ink-2)]">
            Önizleme: {linkPreview.total} eşleştirme bulundu
          </h4>
          {linkPreview.links && linkPreview.links.length > 0 && (
            <div className="rounded-[var(--radius)] border border-[var(--rule)] overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <DocumentTable>
                  <DocumentTableHeader>
                    <DocumentTableRow>
                      <DocumentTableHead>Veli ID</DocumentTableHead>
                      <DocumentTableHead>Öğrenci ID</DocumentTableHead>
                    </DocumentTableRow>
                  </DocumentTableHeader>
                  <DocumentTableBody>
                    {linkPreview.links.slice(0, 20).map((l: BulkLinkEntry, i: number) => (
                      <DocumentTableRow key={i}>
                        <DocumentTableCell className="font-mono text-xs">
                          {l.parentId}
                        </DocumentTableCell>
                        <DocumentTableCell className="font-mono text-xs">
                          {l.childId}
                        </DocumentTableCell>
                      </DocumentTableRow>
                    ))}
                  </DocumentTableBody>
                </DocumentTable>
              </div>
              {linkPreview.links.length > 20 && (
                <p className="px-4 py-2 text-xs text-[var(--ink-dim)] border-t border-[var(--rule)]">
                  …ve {linkPreview.links.length - 20} eşleştirme daha
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {linkResult && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-[var(--ink-2)]">Eşleştirme Sonucu</h4>
          <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border-l-4 border-[var(--ok)] bg-[var(--ok-tint)] px-3 py-2 text-sm text-[var(--ok)]">
            <Check size={14} className="shrink-0" />
            {linkResult.linked} eşleştirme başarıyla yapıldı.
          </div>
          {linkResult.errors && linkResult.errors.length > 0 && (
            <div className="rounded-[var(--radius-sm)] border-l-4 border-[var(--accent)] bg-[var(--accent-tint)] px-3 py-2 text-sm text-[var(--accent)]">
              {linkResult.errors.length} hata:{' '}
              {linkResult.errors
                .slice(0, 5)
                .map((e: BulkLinkError) => `${e.parentId}-${e.childId}: ${e.message}`)
                .join('; ')}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
