import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotesService } from '../../utils/apiService';
import { toast } from 'react-hot-toast';
import { Upload, Plus, BookOpen } from 'lucide-react'; // ArrowLeft removed
import { useAuthContext } from '../../contexts/AuthContext';
import { UserRole } from '../../@types';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';

// User type is now available from AuthContext

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

const NotEkleme: React.FC = () => {
  const { user } = useAuthContext();
  const userRole = user?.rol as UserRole;
  const navigate = useNavigate();

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
    notes: ''
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

    // Load supported formats
    const loadFormats = async () => {
      try {
        const { data, error } = await NotesService.getImportFormats();
        if (error) {
          console.error('Failed to load supported formats:', error);
        } else {
          setSupportedFormats((data as { formats?: string[] })?.formats || ['.xlsx', '.xls', '.csv']);
        }
      } catch (error) {
        console.error('Failed to load supported formats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFormats();
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
      const { data, error } = await NotesService.importNotesFile(formData);
      if (error) {
        toast.error(error);
      } else {
        setImportResult(data as ImportResult);

        if ((data as ImportResult).savedCount > 0) {
          toast.success(`${(data as ImportResult).savedCount} not başarıyla import edildi!`);
        } else {
          toast('Import tamamlandı ancak kaydedilen not bulunamadı', { icon: '⚠️' });
        }
      }

    } catch (error: unknown) {
      console.error('Upload hatası:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Dosya yükleme hatası';
      toast.error(errorMessage);

      if ((error as { response?: { data?: { errors?: unknown } } })?.response?.data?.errors) {
        setImportResult({
          success: false,
          message: errorMessage,
          importedCount: 0,
          savedCount: 0,
          totalNotes: 0,
          errors: (error as any)?.response?.data?.errors || []
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await NotesService.downloadTemplate();
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
      console.error('Şablon indirme hatası:', error);
      toast.error('Şablon indirilemedi');
    }
  };

  const isValidFile = (file: File): boolean => {
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    return supportedFormats.includes(ext);
  };

  const calculateAverage = useCallback(() => {
    const grades = [manualNote.exam1, manualNote.exam2, manualNote.exam3, manualNote.oral, manualNote.project];
    const validGrades = grades.filter(grade => grade !== undefined && grade !== null) as number[];

    if (validGrades.length === 0) {
      setManualNote(prev => ({ ...prev, average: 0 }));
      return;
    }

    const sum = validGrades.reduce((a, b) => a + b, 0);
    const average = Math.round((sum / validGrades.length) * 10) / 10;
    setManualNote(prev => ({ ...prev, average }));
  }, [manualNote.exam1, manualNote.exam2, manualNote.exam3, manualNote.oral, manualNote.project]);

  const handleManualNoteChange = (field: keyof ManualNote, value: string | number | undefined) => {
    setManualNote(prev => ({ ...prev, [field]: value }));
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
        source: 'manual'
      };

      const { error } = await NotesService.createNote(noteData);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Not başarıyla eklendi!');

        // Formu temizle
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
          notes: ''
        });
      }
    } catch (error: unknown) {
      console.error('Not ekleme hatası:', error);
      toast.error('Not eklenemedi');
    } finally {
      setIsAddingNote(false);
    }
  };

  useEffect(() => {
    calculateAverage();
  }, [manualNote.exam1, manualNote.exam2, manualNote.exam3, manualNote.oral, manualNote.project, calculateAverage]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Not Ekleme' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Not Ekleme"
      breadcrumb={breadcrumb}
    >
      <div className="not-ekleme-page">
        <div className="tabs-container">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'import' ? 'active' : ''}`}
              onClick={() => setActiveTab('import')}
            >
              <Upload size={18} className="tab-icon" />
              Toplu İçe Aktar
            </button>
            <button
              className={`tab ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >
              <Plus size={18} className="tab-icon" />
              Manuel Ekle
            </button>
          </div>
        </div>
      </div>

      <div className="tab-content">
        {activeTab === 'import' ? (
          <div className="import-tab">
            <div className="import-instructions">
              <h3>📋 Excel Dosyası İle Toplu Not Yükleme</h3>
              <p>Hazırladığınız Excel dosyasını yükleyerek toplu not girişi yapabilirsiniz.</p>

              <h4>📌 Kurallar:</h4>
              <ul>
                <li>Excel dosyasında ilk satır başlık satırı olmalıdır</li>
                <li>Zorunlu sütunlar: Öğrenci ID, Öğrenci Adı, Ders</li>
                <li>İsteğe bağlı sütunlar: Sınav 1, Sınav 2, Sınav 3, Sözlü, Proje, Dönem, Akademik Yıl</li>
                <li>Boş bırakılan notlar için "-" kullanın veya boş bırakın</li>
              </ul>
            </div>

            <div className="template-download">
              <h4>📋 Excel Şablonu</h4>
              <p>Doğru format için örnek şablonu indirin ve kullanın.</p>
              <button
                onClick={downloadTemplate}
                className="download-button"
              >
                📥 Şablonu İndir
              </button>
            </div>

            {/* File Upload Section */}
            <div className="file-upload-container">
              <h3>📤 Dosya Yükle</h3>

              <div className={`file-upload-area ${file ? 'has-file' : ''}`}>
                <input
                  type="file"
                  accept={supportedFormats.join(',')}
                  onChange={handleFileChange}
                  className="file-input"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="file-upload-label">
                  <div className="file-upload-icon">📁</div>
                  <div className="file-upload-text">
                    {file ? file.name : 'Dosya seçmek için tıklayın'}
                  </div>
                  <div className="file-upload-hint">
                    Desteklenen formatlar: {supportedFormats.join(', ')}
                  </div>
                </label>
              </div>

              {file && !isValidFile(file) && (
                <div className="file-upload-error">
                  ⚠️ Desteklenmeyen dosya formatı. Lütfen {supportedFormats.join(', ')} formatında bir dosya seçin.
                </div>
              )}

              <div className="import-actions">
                <button
                  onClick={handleUpload}
                  disabled={!file || !isValidFile(file) || isUploading}
                  className={`import-button ${file && isValidFile(file) ? 'primary' : 'secondary'}`}
                >
                  {isUploading ? '⏳ Yükleniyor...' : '🚀 Import Et'}
                </button>
              </div>

              {importResult?.saveErrors && importResult.saveErrors.length > 0 && (
                <div className="import-save-errors">
                  <h4 className="import-save-errors-title">
                    💾 Kaydetme Hataları:
                  </h4>
                  <div className="import-save-errors-list">
                    {importResult.saveErrors.map((error, index) => (
                      <div key={index} className="import-save-error-item">
                        • {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Results */}
            {importResult && (
              <div className={`import-result ${importResult.success ? 'success' : 'error'}`}>
                <h3 className="import-result-title">
                  📊 Import Sonuçları
                </h3>


                <div className="import-result-message">
                  {importResult.message}
                </div>

                {/* Hatalar */}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="import-errors">
                    <h4 className="import-errors-title">❌ Hatalar:</h4>
                    <div className="import-errors-list">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="import-error-item">
                          • {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Uyarılar */}
                {importResult.warnings && importResult.warnings.length > 0 && (
                  <div className="import-warnings">
                    <h4 className="import-warnings-title">⚠️ Uyarılar:</h4>
                    <div className="import-warnings-list">
                      {importResult.warnings.map((warning, index) => (
                        <div key={index} className="import-warning-item">
                          • {warning}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Kaydetme Hataları */}
                {importResult.saveErrors && importResult.saveErrors.length > 0 && (
                  <div className="import-save-errors">
                    <h4 className="import-save-errors-title">💾 Kaydetme Hataları:</h4>
                    <div className="import-save-errors-list">
                      {importResult.saveErrors.map((error, index) => (
                        <div key={index} className="import-save-error-item">
                          • {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="manual-tab">
            {/* Manuel Not Ekleme Formu */}
            <div className="manual-note-form">
              <h3 className="manual-note-title">✏️ Manuel Not Ekle</h3>

              <div className="not-ekleme-form-grid">
                {/* Öğrenci Bilgileri */}
                <div className="form-group">
                  <label className="form-label">
                    Öğrenci ID *
                  </label>
                  <input
                    type="text"
                    value={manualNote.studentId}
                    onChange={(e) => handleManualNoteChange('studentId', e.target.value)}
                    className="form-input"
                    placeholder="Öğrenci ID"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    value={manualNote.studentName}
                    onChange={(e) => handleManualNoteChange('studentName', e.target.value)}
                    className="form-input"
                    placeholder="Ad Soyad"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Ders *
                  </label>
                  <input
                    type="text"
                    value={manualNote.lesson}
                    onChange={(e) => handleManualNoteChange('lesson', e.target.value)}
                    className="form-input"
                    placeholder="Ders Adı"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Öğretmen
                  </label>
                  <input
                    type="text"
                    value={manualNote.teacherName}
                    onChange={(e) => handleManualNoteChange('teacherName', e.target.value)}
                    className="form-input"
                    placeholder="Öğretmen Adı"
                  />
                </div>
              </div>

              {/* Not Bilgileri */}
              <div className="grades-section">
                <h4 className="section-title">📊 Not Bilgileri</h4>
                <div className="not-ekleme-grades-grid">
                  <div className="grade-input">
                    <label className="grade-label">
                      1. Sınav
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={manualNote.exam1?.toString() ?? ''}
                      onChange={(e) => handleManualNoteChange('exam1', e.target.value ? Number(e.target.value) : undefined)}
                      className="grade-input-field"
                      placeholder="0-100"
                    />
                  </div>

                  <div className="grade-input">
                    <label className="grade-label">
                      2. Sınav
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={manualNote.exam2?.toString() ?? ''}
                      onChange={(e) => handleManualNoteChange('exam2', e.target.value ? Number(e.target.value) : undefined)}
                      className="grade-input-field"
                      placeholder="0-100"
                    />
                  </div>

                  <div className="grade-input">
                    <label className="grade-label">
                      3. Sınav
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={manualNote.exam3?.toString() ?? ''}
                      onChange={(e) => handleManualNoteChange('exam3', e.target.value ? Number(e.target.value) : undefined)}
                      className="grade-input-field"
                      placeholder="0-100"
                    />
                  </div>

                  <div className="grade-input">
                    <label className="grade-label">
                      Sözlü
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={manualNote.oral?.toString() ?? ''}
                      onChange={(e) => handleManualNoteChange('oral', e.target.value ? Number(e.target.value) : undefined)}
                      className="grade-input-field"
                      placeholder="0-100"
                    />
                  </div>

                  <div className="grade-input">
                    <label className="grade-label">
                      Proje
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={manualNote.project?.toString() ?? ''}
                      onChange={(e) => handleManualNoteChange('project', e.target.value ? Number(e.target.value) : undefined)}
                      className="grade-input-field"
                      placeholder="0-100"
                    />
                  </div>
                </div>
              </div>

              {/* Ortalama */}
              <div className="average-display">
                <span className="average-text">
                  📊 Ortalama: {manualNote.average}
                </span>
              </div>

              {/* Diğer Bilgiler */}
              <div className="not-ekleme-additional-info-grid">
                <div className="info-group">
                  <label className="info-label">
                    Dönem
                  </label>
                  <select
                    value={manualNote.semester}
                    onChange={(e) => handleManualNoteChange('semester', e.target.value)}
                    className="info-select"
                  >
                    <option value="1">1. Dönem</option>
                    <option value="2">2. Dönem</option>
                  </select>
                </div>

                <div className="info-group">
                  <label className="info-label">
                    Öğretim Yılı
                  </label>
                  <input
                    type="text"
                    value={manualNote.academicYear}
                    onChange={(e) => handleManualNoteChange('academicYear', e.target.value)}
                    className="info-input"
                    placeholder="2024-2025"
                  />
                </div>

                <div className="info-group">
                  <label className="info-label">
                    Sınıf
                  </label>
                  <input
                    type="text"
                    value={manualNote.gradeLevel}
                    onChange={(e) => handleManualNoteChange('gradeLevel', e.target.value)}
                    className="info-input"
                    placeholder="9, 10, 11, 12"
                  />
                </div>

                <div className="info-group">
                  <label className="info-label">
                    Şube
                  </label>
                  <input
                    type="text"
                    value={manualNote.classSection}
                    onChange={(e) => handleManualNoteChange('classSection', e.target.value)}
                    className="info-input"
                    placeholder="A, B, C"
                  />
                </div>
              </div>

              {/* Notlar */}
              <div className="notes-section">
                <label className="notes-label">
                  Notlar
                </label>
                <textarea
                  value={manualNote.notes}
                  onChange={(e) => handleManualNoteChange('notes', e.target.value)}
                  className="notes-textarea"
                  placeholder="Ek notlar..."
                />
              </div>

              <button
                onClick={handleAddManualNote}
                disabled={isAddingNote}
                className={`add-note-button ${isAddingNote ? 'disabled' : ''}`}
              >
                {isAddingNote ? '⏳ Ekleniyor...' : '✅ Not Ekle'}
              </button>
            </div>
          </div>
        )}

        <div className="important-notes">
          <h4>💡 Önemli Notlar</h4>
          <ul>
            <li>Dosya boyutu maksimum 10MB olmalıdır</li>
            <li>İlk satır başlık satırı olmalıdır</li>
            <li>Zorunlu alanlar: Öğrenci ID, Öğrenci Adı, Ders</li>
            <li>Not değerleri 0-100 arasında olmalıdır</li>
            <li>Boş notlar için "-" veya boş bırakın</li>
            <li>Ortalama otomatik hesaplanır</li>
          </ul>
        </div>
      </div>
    </ModernDashboardLayout>
  );
};

export default NotEkleme;