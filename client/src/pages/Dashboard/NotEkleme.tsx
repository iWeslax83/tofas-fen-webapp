import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotesService } from '../../utils/apiService';
import { toast } from 'sonner';
import {
  Upload,
  Plus,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { UserRole } from '../../@types';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { safeConsoleError } from '../../utils/safeLogger';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { cn } from '../../utils/cn';

interface ImportResult {
  success: boolean;
  message: string;
  importedCount: number;
  savedCount: number;
  totalNotes: number;
  errors?: string[];
  warnings?: string[];
  saveErrors?: string[];
}

interface ManualNote {
  studentId: string;
  studentName: string;
  lesson: string;
  exam1?: number | undefined;
  exam2?: number | undefined;
  exam3?: number | undefined;
  oral?: number | undefined;
  project?: number | undefined;
  average: number;
  semester: string;
  academicYear: string;
  teacherName?: string | undefined;
  gradeLevel?: string | undefined;
  classSection?: string | undefined;
  notes?: string | undefined;
}

// ─── small helpers ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)] border-b border-[var(--rule)] pb-1 mb-3">
      {children}
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
      {children}
      {required && <span className="text-[var(--state)] ml-0.5">*</span>}
    </span>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

const NotEkleme: React.FC = () => {
  const { user } = useAuthContext();
  const userRole = user?.rol as UserRole;
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [supportedFormats, setSupportedFormats] = useState<string[]>(['.xlsx', '.xls', '.csv']);
  const [activeTab, setActiveTab] = useState<'import' | 'manual'>('import');
  const [loading, setLoading] = useState(true);
  const [manualNote, setManualNote] = useState<ManualNote>({
    studentId: '',
    studentName: '',
    lesson: '',
    exam1: undefined,
    exam2: undefined,
    exam3: undefined,
    oral: undefined,
    project: undefined,
    average: 0,
    semester: '1',
    academicYear: new Date().getFullYear().toString(),
    teacherName: '',
    gradeLevel: '',
    classSection: '',
    notes: '',
  });
  const [isAddingNote, setIsAddingNote] = useState(false);

  useEffect(() => {
    if (!userRole) {
      navigate('/login');
      return;
    }

    if (!['admin', 'teacher'].includes(userRole)) {
      navigate('/');
      return;
    }

    setSupportedFormats(['.xlsx', '.xls', '.csv']);
    setLoading(false);
  }, [userRole, navigate]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Lütfen bir dosya seçin');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data, error } = await NotesService.importNotesExcel(formData);
      if (error) {
        toast.error(error);
      } else {
        setImportResult(data as ImportResult);

        if ((data as ImportResult).savedCount > 0) {
          toast.success(`${(data as ImportResult).savedCount} not başarıyla import edildi!`);
        } else {
          toast('Import tamamlandı ancak kaydedilen not bulunamadı');
        }
      }
    } catch (error: unknown) {
      safeConsoleError('Upload hatası:', error);
      const errorMessage =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Dosya yükleme hatası';
      toast.error(errorMessage);

      if ((error as { response?: { data?: { errors?: unknown } } })?.response?.data?.errors) {
        setImportResult({
          success: false,
          message: errorMessage,
          importedCount: 0,
          savedCount: 0,
          totalNotes: 0,
          errors: (error as any)?.response?.data?.errors || [],
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await NotesService.getTemplates();
      const url = window.URL.createObjectURL(new Blob([(response as { data: string }).data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'not_import_sablonu.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Şablon başarıyla indirildi!');
    } catch (error) {
      safeConsoleError('Şablon indirme hatası:', error);
      toast.error('Şablon indirilemedi');
    }
  };

  const isValidFile = (f: File): boolean => {
    const ext = f.name.toLowerCase().substring(f.name.lastIndexOf('.'));
    return supportedFormats.includes(ext);
  };

  const calculateAverage = useCallback(() => {
    const grades = [
      manualNote.exam1,
      manualNote.exam2,
      manualNote.exam3,
      manualNote.oral,
      manualNote.project,
    ];
    const validGrades = grades.filter((grade) => grade !== undefined && grade !== null) as number[];

    if (validGrades.length === 0) {
      setManualNote((prev) => ({ ...prev, average: 0 }));
      return;
    }

    const sum = validGrades.reduce((a, b) => a + b, 0);
    const average = Math.round((sum / validGrades.length) * 10) / 10;
    setManualNote((prev) => ({ ...prev, average }));
  }, [manualNote.exam1, manualNote.exam2, manualNote.exam3, manualNote.oral, manualNote.project]);

  const handleManualNoteChange = (field: keyof ManualNote, value: string | number | undefined) => {
    setManualNote((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddManualNote = async () => {
    if (!manualNote.studentId || !manualNote.studentName || !manualNote.lesson) {
      toast.error('Öğrenci ID, Ad Soyad ve Ders alanları zorunludur');
      return;
    }

    setIsAddingNote(true);
    try {
      const noteData = {
        ...manualNote,
        source: 'manual',
      };

      const { error } = await NotesService.createNote(noteData);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Not başarıyla eklendi!');

        setManualNote({
          studentId: '',
          studentName: '',
          lesson: '',
          exam1: undefined,
          exam2: undefined,
          exam3: undefined,
          oral: undefined,
          project: undefined,
          average: 0,
          semester: '1',
          academicYear: new Date().getFullYear().toString(),
          teacherName: '',
          gradeLevel: '',
          classSection: '',
          notes: '',
        });
      }
    } catch (error: unknown) {
      safeConsoleError('Not ekleme hatası:', error);
      toast.error('Not eklenemedi');
    } finally {
      setIsAddingNote(false);
    }
  };

  useEffect(() => {
    calculateAverage();
  }, [
    manualNote.exam1,
    manualNote.exam2,
    manualNote.exam3,
    manualNote.oral,
    manualNote.project,
    calculateAverage,
  ]);

  if (loading) {
    return (
      <ModernDashboardLayout
        pageTitle="Not Ekleme"
        breadcrumb={[
          { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
          { label: 'Not Ekleme' },
        ]}
      >
        <div className="p-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          Yükleniyor…
        </div>
      </ModernDashboardLayout>
    );
  }

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Not Ekleme' },
  ];

  return (
    <ModernDashboardLayout pageTitle="Not Ekleme" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        {/* ── Page header ── */}
        <header>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
            Belge No. {new Date().getFullYear()}/NE
          </div>
          <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Toplu Not İçe Aktarma</h1>
        </header>

        {/* ── Tab strip ── */}
        <div className="flex border-b border-[var(--rule)]">
          {(
            [
              { key: 'import', label: 'Toplu İçe Aktar', icon: Upload },
              { key: 'manual', label: 'Manuel Ekle', icon: Plus },
            ] as const
          ).map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] border-b-2 -mb-px transition-colors',
                  active
                    ? 'border-[var(--state)] text-[var(--ink)]'
                    : 'border-transparent text-[var(--ink-dim)] hover:text-[var(--ink)]',
                )}
                aria-pressed={active}
              >
                <Icon size={14} />
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Tab: Toplu İçe Aktar ── */}
        {activeTab === 'import' && (
          <div className="space-y-5">
            {/* Instructions */}
            <Card accentBar contentClassName="p-5">
              <SectionLabel>Kurallar</SectionLabel>
              <ul className="space-y-1.5">
                {[
                  'Excel dosyasında ilk satır başlık satırı olmalıdır.',
                  'Zorunlu sütunlar: Öğrenci ID, Öğrenci Adı, Ders.',
                  'İsteğe bağlı: Sınav 1, Sınav 2, Sınav 3, Sözlü, Proje, Dönem, Akademik Yıl.',
                  'Boş bırakılan notlar için "-" kullanın veya hücreyi boş bırakın.',
                ].map((rule, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 font-serif text-sm text-[var(--ink-2)]"
                  >
                    <span className="font-mono text-[10px] text-[var(--ink-dim)] mt-0.5 select-none">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {rule}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Template download */}
            <Card contentClassName="p-5">
              <SectionLabel>Excel Şablonu</SectionLabel>
              <p className="font-serif text-sm text-[var(--ink-2)] mb-4">
                Doğru format için örnek şablonu indirin ve kullanın.
              </p>
              <Button variant="secondary" size="sm" onClick={downloadTemplate}>
                <Download size={14} />
                Şablonu İndir
              </Button>
            </Card>

            {/* File upload */}
            <Card contentClassName="p-5">
              <SectionLabel>Dosya Yükle</SectionLabel>

              {/* Hidden native input + styled trigger */}
              <input
                ref={fileInputRef}
                type="file"
                accept={supportedFormats.join(',')}
                onChange={handleFileChange}
                className="sr-only"
                id="file-upload"
                aria-label="Dosya seç"
              />

              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  <FileSpreadsheet size={14} />
                  Dosya Seç
                </Button>

                {file ? (
                  <span className="font-mono text-xs text-[var(--ink-2)]">{file.name}</span>
                ) : (
                  <span className="font-mono text-[10px] text-[var(--ink-dim)]">
                    {supportedFormats.join(' · ')}
                  </span>
                )}
              </div>

              {/* Invalid format warning */}
              {file && !isValidFile(file) && (
                <div className="mt-3 flex items-start gap-2 p-3 border border-[var(--warn)] bg-transparent">
                  <AlertTriangle size={14} className="text-[var(--warn)] mt-0.5 shrink-0" />
                  <span className="font-serif text-sm text-[var(--ink-2)]">
                    Desteklenmeyen dosya formatı. Lütfen{' '}
                    <span className="font-mono">{supportedFormats.join(', ')}</span> formatında bir
                    dosya seçin.
                  </span>
                </div>
              )}

              <div className="mt-4">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleUpload}
                  disabled={!file || !isValidFile(file) || isUploading}
                  loading={isUploading}
                >
                  <Upload size={14} />
                  {isUploading ? 'Yükleniyor…' : 'Import Et'}
                </Button>
              </div>
            </Card>

            {/* Import result */}
            {importResult && (
              <Card contentClassName="p-5">
                <SectionLabel>Import Sonuçları</SectionLabel>

                <div
                  className={cn(
                    'flex items-start gap-2 mb-4',
                    importResult.success ? 'text-[var(--ok)]' : 'text-[var(--state)]',
                  )}
                >
                  {importResult.success ? (
                    <CheckCircle size={16} className="mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  )}
                  <span className="font-serif text-sm">{importResult.message}</span>
                </div>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mb-4">
                    <SectionLabel>Hatalar</SectionLabel>
                    <ul className="space-y-1">
                      {importResult.errors.map((err, i) => (
                        <li key={i} className="font-mono text-xs text-[var(--state)]">
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {importResult.warnings && importResult.warnings.length > 0 && (
                  <div className="mb-4">
                    <SectionLabel>Uyarılar</SectionLabel>
                    <ul className="space-y-1">
                      {importResult.warnings.map((w, i) => (
                        <li key={i} className="font-mono text-xs text-[var(--warn)]">
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {importResult.saveErrors && importResult.saveErrors.length > 0 && (
                  <div>
                    <SectionLabel>Kaydetme Hataları</SectionLabel>
                    <ul className="space-y-1">
                      {importResult.saveErrors.map((err, i) => (
                        <li key={i} className="font-mono text-xs text-[var(--state)]">
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {/* ── Tab: Manuel Ekle ── */}
        {activeTab === 'manual' && (
          <div className="space-y-5">
            {/* Student info */}
            <Card contentClassName="p-5">
              <SectionLabel>Öğrenci Bilgileri</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <label className="flex flex-col gap-1">
                  <FieldLabel required>Öğrenci ID</FieldLabel>
                  <Input
                    value={manualNote.studentId}
                    onChange={(e) => handleManualNoteChange('studentId', e.target.value)}
                    placeholder="Öğrenci ID"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <FieldLabel required>Ad Soyad</FieldLabel>
                  <Input
                    value={manualNote.studentName}
                    onChange={(e) => handleManualNoteChange('studentName', e.target.value)}
                    placeholder="Ad Soyad"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <FieldLabel required>Ders</FieldLabel>
                  <Input
                    value={manualNote.lesson}
                    onChange={(e) => handleManualNoteChange('lesson', e.target.value)}
                    placeholder="Ders Adı"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <FieldLabel>Öğretmen</FieldLabel>
                  <Input
                    value={manualNote.teacherName ?? ''}
                    onChange={(e) => handleManualNoteChange('teacherName', e.target.value)}
                    placeholder="Öğretmen Adı"
                  />
                </label>
              </div>
            </Card>

            {/* Grades */}
            <Card contentClassName="p-5">
              <SectionLabel>Not Bilgileri</SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-6 gap-y-4">
                {(
                  [
                    { field: 'exam1', label: '1. Sınav' },
                    { field: 'exam2', label: '2. Sınav' },
                    { field: 'exam3', label: '3. Sınav' },
                    { field: 'oral', label: 'Sözlü' },
                    { field: 'project', label: 'Proje' },
                  ] as const
                ).map(({ field, label }) => (
                  <label key={field} className="flex flex-col gap-1">
                    <FieldLabel>{label}</FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={manualNote[field]?.toString() ?? ''}
                      onChange={(e) =>
                        handleManualNoteChange(
                          field,
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      placeholder="0–100"
                    />
                  </label>
                ))}
              </div>

              {/* Average display */}
              <div className="mt-4 pt-3 border-t border-[var(--rule)] flex items-baseline gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
                  Ortalama
                </span>
                <span className="font-serif text-2xl text-[var(--ink)]">{manualNote.average}</span>
              </div>
            </Card>

            {/* Additional info */}
            <Card contentClassName="p-5">
              <SectionLabel>Ek Bilgiler</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                <label className="flex flex-col gap-1">
                  <FieldLabel>Dönem</FieldLabel>
                  <select
                    value={manualNote.semester}
                    onChange={(e) => handleManualNoteChange('semester', e.target.value)}
                    className={cn(
                      'w-full bg-transparent border-0 border-b border-[var(--rule)] px-1 py-2',
                      'text-[var(--ink)]',
                      'focus:outline-none focus:border-[var(--state)] focus:border-b-2 focus:pb-[7px]',
                      'transition-colors',
                    )}
                  >
                    <option value="1">1. Dönem</option>
                    <option value="2">2. Dönem</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <FieldLabel>Öğretim Yılı</FieldLabel>
                  <Input
                    value={manualNote.academicYear}
                    onChange={(e) => handleManualNoteChange('academicYear', e.target.value)}
                    placeholder="2024-2025"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <FieldLabel>Sınıf</FieldLabel>
                  <Input
                    value={manualNote.gradeLevel ?? ''}
                    onChange={(e) => handleManualNoteChange('gradeLevel', e.target.value)}
                    placeholder="9, 10, 11, 12"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <FieldLabel>Şube</FieldLabel>
                  <Input
                    value={manualNote.classSection ?? ''}
                    onChange={(e) => handleManualNoteChange('classSection', e.target.value)}
                    placeholder="A, B, C"
                  />
                </label>
              </div>
            </Card>

            {/* Notes textarea */}
            <Card contentClassName="p-5">
              <SectionLabel>Notlar</SectionLabel>
              <label className="flex flex-col gap-1">
                <FieldLabel>Ek Notlar</FieldLabel>
                <textarea
                  value={manualNote.notes ?? ''}
                  onChange={(e) => handleManualNoteChange('notes', e.target.value)}
                  rows={3}
                  placeholder="Ek notlar…"
                  className={cn(
                    'w-full bg-transparent border-0 border-b border-[var(--rule)] px-1 py-2',
                    'text-[var(--ink)] placeholder:text-[var(--ink-dim)]',
                    'focus:outline-none focus:border-[var(--state)] focus:border-b-2 focus:pb-[7px]',
                    'transition-colors resize-y min-h-[4rem]',
                  )}
                />
              </label>

              <div className="mt-4">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleAddManualNote}
                  disabled={isAddingNote}
                  loading={isAddingNote}
                >
                  <Plus size={14} />
                  {isAddingNote ? 'Ekleniyor…' : 'Not Ekle'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── Footer notice ── */}
        <Card tone="tinted" contentClassName="p-4">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-[var(--ink-dim)] mt-0.5 shrink-0" />
            <div className="space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
                Önemli Bilgiler
              </div>
              <ul className="space-y-0.5">
                {[
                  'Dosya boyutu maksimum 10 MB olmalıdır.',
                  'İlk satır başlık satırı olmalıdır.',
                  'Zorunlu alanlar: Öğrenci ID, Öğrenci Adı, Ders.',
                  'Not değerleri 0–100 arasında olmalıdır.',
                  'Boş notlar için "-" veya boş bırakın.',
                  'Ortalama otomatik hesaplanır.',
                ].map((note, i) => (
                  <li key={i} className="font-serif text-sm text-[var(--ink-2)]">
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </ModernDashboardLayout>
  );
};

export default NotEkleme;
