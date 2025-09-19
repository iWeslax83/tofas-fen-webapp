import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Upload, 
  Download, 
  Search, 
  Edit,
  Trash2,
  Plus,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { NotesService } from '../../utils/apiService';
// import { SecureAPI } from '../../utils/api'; // Not used
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { useAuthContext } from '../../contexts/AuthContext';

interface Note {
  _id: string;
  studentId: string;
  studentName: string;
  lesson: string;
  semester: string;
  academicYear: string;
  midterm: number;
  final: number;
  average: number;
  grade: string;
  lastUpdated: string;
  isActive: boolean;
}

interface NotesStats {
  totalNotes: number;
  activeNotes: number;
  averageGrade: number;
  topLesson: string;
  topLessonAverage: number;
  semesterBreakdown: Record<string, number>;
  gradeDistribution: Record<string, number>;
}

interface ImportFormat {
  name: string;
  description: string;
  extension: string;
  templateUrl: string;
}

export default function AdvancedNotesPage() {
  const { user } = useAuthContext();
  const [notes, setNotes] = useState<Note[]>([]);
  const [, setStats] = useState<NotesStats | null>(null);
  const [importFormats, setImportFormats] = useState<ImportFormat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    semester: '',
    academicYear: '',
    lesson: '',
    grade: ''
  });
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    semester: '',
    academicYear: '',
    lesson: ''
  });
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [notesRes, statsRes, formatsRes] = await Promise.all([
        NotesService.getNotes(),
        NotesService.getNotesStats(),
        NotesService.getImportFormats()
      ]);

      const notesData = notesRes.data || [];
      const statsData = statsRes.data || {};
      const formatsData = formatsRes.data || [];

      setNotes(notesData as Note[]);
      setStats(statsData as NotesStats);
      setImportFormats(formatsData as ImportFormat[]);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBulkUpdate = async () => {
    if (selectedNotes.length === 0) {
      setError('Lütfen güncellenecek notları seçin');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const { error } = await NotesService.bulkUpdateNotes(selectedNotes, bulkEditData);
      if (error) {
        setError(error);
        return;
      }

      setSuccessMessage(`${selectedNotes.length} not başarıyla güncellendi`);
      setSelectedNotes([]);
      setShowBulkEdit(false);
      setBulkEditData({ semester: '', academicYear: '', lesson: '' });
      
      // Refresh data
      setTimeout(() => {
        fetchData();
        setSuccessMessage(null);
      }, 2000);

    } catch (err) {
      console.error('Error bulk updating notes:', err);
      setError('Notlar güncellenirken hata oluştu');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Bu notu silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const { error } = await NotesService.deleteNote(noteId);
      if (error) {
        setError(error);
        return;
      }

      setSuccessMessage('Not başarıyla silindi');
      
      // Refresh data
      setTimeout(() => {
        fetchData();
        setSuccessMessage(null);
      }, 2000);

    } catch (err) {
      console.error('Error deleting note:', err);
      setError('Not silinirken hata oluştu');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadTemplate = async (format: ImportFormat) => {
    try {
      const response = await NotesService.downloadTemplate();
      // Handle file download
      const blob = new Blob([(response as { data: string }).data], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notlar_template.${format.extension}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading template:', err);
      setError('Şablon indirilirken hata oluştu');
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.lesson.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSemester = !filters.semester || note.semester === filters.semester;
    const matchesYear = !filters.academicYear || note.academicYear === filters.academicYear;
    const matchesLesson = !filters.lesson || note.lesson === filters.lesson;
    const matchesGrade = !filters.grade || note.grade === filters.grade;

    return matchesSearch && matchesSemester && matchesYear && matchesLesson && matchesGrade;
  });

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'advanced-notes-grade-badge-a';
      case 'B': return 'advanced-notes-grade-badge-b';
      case 'C': return 'advanced-notes-grade-badge-c';
      case 'D': return 'advanced-notes-grade-badge-d';
      case 'F': return 'advanced-notes-grade-badge-f';
      default: return 'advanced-notes-grade-badge-default';
    }
  };

  if (loading) {
    return (
      <div className="advanced-notes-loading">
        <div className="advanced-notes-loading-content">
          <div className="advanced-notes-loading-skeleton">
            <div className="advanced-notes-loading-title"></div>
            <div className="advanced-notes-loading-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="advanced-notes-loading-card"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Gelişmiş Not Yönetimi' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Gelişmiş Not Yönetimi"
      breadcrumb={breadcrumb}
    >
      <div className="advanced-notes-container">
        <div className="advanced-notes-content">
          {/* Header */}
          <div className="advanced-notes-header">
            <div>
              <h1 className="advanced-notes-title">Gelişmiş Not Yönetimi</h1>
              <p className="advanced-notes-subtitle">Notları toplu olarak yönetin, istatistikleri görüntüleyin ve içe aktarın</p>
            </div>
          <div className="advanced-notes-actions">
            <button
              onClick={() => setShowBulkEdit(true)}
              disabled={selectedNotes.length === 0}
              className="advanced-notes-button advanced-notes-button-yellow"
            >
              <Edit className="h-4 w-4" />
              Toplu Düzenle ({selectedNotes.length})
            </button>
            <button className="advanced-notes-button advanced-notes-button-blue">
              <Plus className="h-4 w-4" />
              Yeni Not
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="advanced-notes-message advanced-notes-message-success"
          >
            <CheckCircle className="h-5 w-5 icon" />
            <span className="text">{successMessage}</span>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="advanced-notes-message advanced-notes-message-error"
          >
            <AlertTriangle className="h-5 w-5 icon" />
            <span className="text">{error}</span>
          </motion.div>
        )}


        {/* Search and Filters */}
        <div className="advanced-notes-filters">
          <div className="advanced-notes-filters-header">
            <h2 className="advanced-notes-filters-title">
              <Search className="h-5 w-5" />
              Filtreler
            </h2>
          </div>
          
          <div className="advanced-notes-filters-content">
            <div className="advanced-notes-filters-grid">
              {/* Search */}
              <div className="advanced-notes-filters-search">
                <div className="relative">
                  <Search className="advanced-notes-filters-search-icon" />
                  <input
                    type="text"
                    placeholder="Öğrenci, ders veya ID ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="advanced-notes-filters-input"
                  />
                </div>
              </div>

              {/* Semester Filter */}
              <div>
                <select
                  value={filters.semester}
                  onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
                  className="advanced-notes-filters-select"
                >
                  <option value="">Tüm Dönemler</option>
                  {Array.from(new Set(notes.map(note => note.semester))).map(semester => (
                    <option key={semester} value={semester}>{semester}</option>
                  ))}
                </select>
              </div>

              {/* Academic Year Filter */}
              <div>
                <select
                  value={filters.academicYear}
                  onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })}
                  className="advanced-notes-filters-select"
                >
                  <option value="">Tüm Yıllar</option>
                  {Array.from(new Set(notes.map(note => note.academicYear))).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Grade Filter */}
              <div>
                <select
                  value={filters.grade}
                  onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
                  className="advanced-notes-filters-select"
                >
                  <option value="">Tüm Notlar</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="F">F</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Import Formats */}
        <div className="advanced-notes-import">
          <div className="advanced-notes-import-header">
            <h2 className="advanced-notes-import-title">
              <Upload className="h-5 w-5" />
              İçe Aktarma Formatları
            </h2>
          </div>
          
          <div className="advanced-notes-import-content">
            <div className="advanced-notes-import-grid">
              {importFormats.map((format, index) => (
                <motion.div
                  key={format.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="advanced-notes-import-card"
                >
                  <div className="advanced-notes-import-card-header">
                    <span className="advanced-notes-import-card-name">{format.name}</span>
                    <span className="advanced-notes-import-card-extension">{format.extension}</span>
                  </div>
                  
                  <p className="advanced-notes-import-card-description">{format.description}</p>
                  
                  <button
                    onClick={() => handleDownloadTemplate(format)}
                    className="advanced-notes-import-card-button"
                  >
                    <Download className="h-4 w-4" />
                    Şablon İndir
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Notes Table */}
        <div className="advanced-notes-table-container">
          <div className="advanced-notes-table-header">
            <h2 className="advanced-notes-table-title">
              <FileText className="h-5 w-5" />
              Notlar ({filteredNotes.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="advanced-notes-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedNotes.length === filteredNotes.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedNotes(filteredNotes.map(note => note._id));
                        } else {
                          setSelectedNotes([]);
                        }
                      }}
                      className="advanced-notes-table-checkbox"
                    />
                  </th>
                  <th>Öğrenci</th>
                  <th>Ders</th>
                  <th>Dönem</th>
                  <th>Vize</th>
                  <th>Final</th>
                  <th>Ortalama</th>
                  <th>Harf Notu</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotes.map((note, index) => (
                  <motion.tr
                    key={note._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedNotes.includes(note._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedNotes([...selectedNotes, note._id]);
                          } else {
                            setSelectedNotes(selectedNotes.filter(id => id !== note._id));
                          }
                        }}
                        className="advanced-notes-table-checkbox"
                      />
                    </td>
                    <td>
                      <div className="advanced-notes-table-student">
                        <div className="advanced-notes-table-student-name">{note.studentName}</div>
                        <div className="advanced-notes-table-student-id">{note.studentId}</div>
                      </div>
                    </td>
                    <td>{note.lesson}</td>
                    <td>{note.semester} - {note.academicYear}</td>
                    <td>{note.midterm}</td>
                    <td>{note.final}</td>
                    <td>{note.average?.toFixed(2)}</td>
                    <td>
                      <span className={`advanced-notes-grade-badge ${getGradeColor(note.grade)}`}>
                        {note.grade}
                      </span>
                    </td>
                    <td>
                      <div className="advanced-notes-table-actions">
                        <button
                          onClick={() => {/* Handle edit */}}
                          className="advanced-notes-table-action-button"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note._id)}
                          disabled={processing}
                          className="advanced-notes-table-action-button advanced-notes-table-action-button-delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bulk Edit Modal */}
        {showBulkEdit && (
          <div className="advanced-notes-modal-overlay">
            <div className="advanced-notes-modal">
              <h2 className="advanced-notes-modal-title">
                Toplu Düzenle ({selectedNotes.length} not)
              </h2>
              
              <div className="advanced-notes-modal-form">
                <div>
                  <label className="advanced-notes-modal-label">
                    Dönem
                  </label>
                  <select
                    value={bulkEditData.semester}
                    onChange={(e) => setBulkEditData({ ...bulkEditData, semester: e.target.value })}
                    className="advanced-notes-modal-select"
                  >
                    <option value="">Değiştirme</option>
                    {Array.from(new Set(notes.map(note => note.semester))).map(semester => (
                      <option key={semester} value={semester}>{semester}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="advanced-notes-modal-label">
                    Akademik Yıl
                  </label>
                  <select
                    value={bulkEditData.academicYear}
                    onChange={(e) => setBulkEditData({ ...bulkEditData, academicYear: e.target.value })}
                    className="advanced-notes-modal-select"
                  >
                    <option value="">Değiştirme</option>
                    {Array.from(new Set(notes.map(note => note.academicYear))).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="advanced-notes-modal-label">
                    Ders
                  </label>
                  <select
                    value={bulkEditData.lesson}
                    onChange={(e) => setBulkEditData({ ...bulkEditData, lesson: e.target.value })}
                    className="advanced-notes-modal-select"
                  >
                    <option value="">Değiştirme</option>
                    {Array.from(new Set(notes.map(note => note.lesson))).map(lesson => (
                      <option key={lesson} value={lesson}>{lesson}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="advanced-notes-modal-actions">
                <button
                  onClick={() => {
                    setShowBulkEdit(false);
                    setBulkEditData({ semester: '', academicYear: '', lesson: '' });
                  }}
                  className="advanced-notes-modal-button advanced-notes-modal-button-cancel"
                >
                  İptal
                </button>
                <button
                  onClick={handleBulkUpdate}
                  disabled={processing}
                  className="advanced-notes-modal-button advanced-notes-modal-button-update"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Güncelleniyor...
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4" />
                      Güncelle
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </ModernDashboardLayout>
  );
}
