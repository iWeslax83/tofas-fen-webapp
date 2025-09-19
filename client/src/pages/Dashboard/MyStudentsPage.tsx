import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { UserService } from '../../utils/apiService';
// import NotificationBell from '../../components/NotificationBell'; // Not used
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { 
  Users, 
  Search, 
  // Filter, // Not used
  BookOpen, 
  // TrendingUp, // Not used
  Calendar, 
  Mail, 
  Phone,
  MapPin,
  GraduationCap,
  Eye,
  Edit,
  MessageSquare,
  // BarChart3, // Not used
  Download,
  Plus,
  ChevronDown,
  ChevronUp
  // MoreHorizontal // Not used
} from 'lucide-react';
import './MyStudentsPage.css';

interface Student {
  id: string;
  adSoyad: string;
  ogrenciNo: string;
  sinif: string;
  sube: string;
  email?: string;
  telefon?: string;
  adres?: string;
  veliAdi?: string;
  veliTelefon?: string;
  notOrtalamasi?: number;
  devamsizlik?: number;
  sonGiris?: string;
  durum: 'aktif' | 'pasif' | 'mezun';
  foto?: string;
}

// interface ClassStats { // Not used
//   sinif: string;
//   ogrenciSayisi: number;
//   ortalamaNot: number;
//   devamsizlikOrani: number;
// }

export default function MyStudentsPage() {
  const { user } = useAuthContext();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('adSoyad');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Students data will be fetched from API
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await UserService.getStudentsByRole('student');
        if (error) {
          console.error('Error fetching students:', error);
          setError('Öğrenci bilgileri yüklenirken bir hata oluştu');
        } else {
          setStudents((data as { data: Student[] }).data || []);
          setFilteredStudents((data as { data: Student[] }).data || []);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        setError('Öğrenci bilgileri yüklenirken bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, []);

  useEffect(() => {
    let filtered = students;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.adSoyad.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.ogrenciNo.includes(searchTerm) ||
        student.sinif.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Class filter
    if (selectedClass !== 'all') {
      filtered = filtered.filter(student => student.sinif === selectedClass);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(student => student.durum === selectedStatus);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: string | number = a[sortBy as keyof Student] as string | number;
      let bValue: string | number = b[sortBy as keyof Student] as string | number;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredStudents(filtered);
  }, [students, searchTerm, selectedClass, selectedStatus, sortBy, sortOrder]);

  const getUniqueClasses = () => {
    const classes = [...new Set(students.map(student => student.sinif))];
    return classes.sort();
  };

  // getClassStats function removed as not used

  const toggleExpanded = (id: string) => {
    setExpandedStudent(expandedStudent === id ? null : id);
  };

  const getStatusColor = (durum: string) => {
    switch (durum) {
      case 'aktif': return 'status-active';
      case 'pasif': return 'status-inactive';
      case 'mezun': return 'status-graduated';
      default: return 'status-default';
    }
  };

  const getGradeColor = (not: number) => {
    if (not >= 90) return 'grade-excellent';
    if (not >= 80) return 'grade-good';
    if (not >= 70) return 'grade-average';
    return 'grade-poor';
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Öğrencilerim' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Öğrencilerim"
      breadcrumb={breadcrumb}
    >
      <div className="students-page">

      <div className="container">

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="filters-card"
        >
          <div className="my-students-filters-grid">
            {/* Search */}
            <div className="search-filter">
              <label htmlFor="search" className="filter-label">
                Öğrenci Ara
              </label>
              <div className="search-container">
                <Search className="search-icon" />
                <input
                  type="text"
                  id="search"
                  placeholder="Ad, soyad veya öğrenci no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {/* Class Filter */}
            <div className="filter-group">
              <label htmlFor="class-filter" className="filter-label">
                Sınıf
              </label>
              <select
                id="class-filter"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="filter-select"
              >
                <option value="all">Tüm Sınıflar</option>
                {getUniqueClasses().map(sinif => (
                  <option key={sinif} value={sinif}>{sinif}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="filter-group">
              <label htmlFor="status-filter" className="filter-label">
                Durum
              </label>
              <select
                id="status-filter"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="aktif">Aktif</option>
                <option value="pasif">Pasif</option>
                <option value="mezun">Mezun</option>
              </select>
            </div>

            {/* Sort */}
            <div className="filter-group">
              <label htmlFor="sort-by" className="filter-label">
                Sırala
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="adSoyad">Ad Soyad</option>
                <option value="ogrenciNo">Öğrenci No</option>
                <option value="sinif">Sınıf</option>
                <option value="notOrtalamasi">Not Ortalaması</option>
                <option value="devamsizlik">Devamsızlık</option>
              </select>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="filters-actions">
            <div className="sort-order">
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="sort-button"
              >
                {sortOrder === 'asc' ? 'Artan' : 'Azalan'}
              </button>
            </div>

            <div className="view-toggle">
              <button
                onClick={() => setViewMode('grid')}
                className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
              >
                <div className="view-grid-icon">
                  <div className="view-grid-dot"></div>
                  <div className="view-grid-dot"></div>
                  <div className="view-grid-dot"></div>
                  <div className="view-grid-dot"></div>
                </div>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
              >
                <div className="list-icon">
                  <div className="list-line"></div>
                  <div className="list-line"></div>
                  <div className="list-line"></div>
                </div>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Students Grid/List */}
        {viewMode === 'grid' ? (
          <div className="my-students-grid">
            {filteredStudents.map((student, index) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="student-card"
              >
                {/* Student Header */}
                <div className="student-header">
                  <div className="student-info">
                    <div className="student-avatar">
                      {student.adSoyad.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="student-details">
                      <h3 className="student-name">{student.adSoyad}</h3>
                      <p className="student-number">{student.ogrenciNo}</p>
                    </div>
                  </div>
                  <div className="student-actions">
                    <span className={`status-badge ${getStatusColor(student.durum)}`}>
                      {student.durum.charAt(0).toUpperCase() + student.durum.slice(1)}
                    </span>
                    <button
                      onClick={() => toggleExpanded(student.id)}
                      className="expand-button"
                    >
                      {expandedStudent === student.id ? (
                        <ChevronUp className="chevron-icon" />
                      ) : (
                        <ChevronDown className="chevron-icon" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="student-basic-info">
                  <div className="info-item">
                    <GraduationCap className="info-icon" />
                    <span>{student.sinif}</span>
                  </div>
                  <div className="info-item">
                    <BookOpen className="info-icon" />
                    <span className={getGradeColor(student.notOrtalamasi || 0)}>
                      Not: {student.notOrtalamasi?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                  <div className="info-item">
                    <Calendar className="info-icon" />
                    <span>Devamsızlık: {student.devamsizlik}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="student-actions-bar">
                  <button className="action-button view-button">
                    <Eye className="action-icon" />
                    <span>Detay</span>
                  </button>
                  <button className="action-button message-button">
                    <MessageSquare className="action-icon" />
                    <span>Mesaj</span>
                  </button>
                  <button className="action-button edit-button">
                    <Edit className="action-icon" />
                    <span>Düzenle</span>
                  </button>
                </div>

                {/* Expanded Details */}
                {expandedStudent === student.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="student-expanded"
                  >
                    <div className="expanded-content">
                      {student.email && (
                        <div className="expanded-item">
                          <Mail className="expanded-icon" />
                          <span>{student.email}</span>
                        </div>
                      )}
                      {student.telefon && (
                        <div className="expanded-item">
                          <Phone className="expanded-icon" />
                          <span>{student.telefon}</span>
                        </div>
                      )}
                      {student.adres && (
                        <div className="expanded-item">
                          <MapPin className="expanded-icon" />
                          <span>{student.adres}</span>
                        </div>
                      )}
                      {student.veliAdi && (
                        <div className="expanded-item">
                          <Users className="expanded-icon" />
                          <span>Veli: {student.veliAdi}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="students-table-container">
            <div className="students-table">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Öğrenci</th>
                    <th className="table-header-cell">Sınıf</th>
                    <th className="table-header-cell">Not Ort.</th>
                    <th className="table-header-cell">Devamsızlık</th>
                    <th className="table-header-cell">Durum</th>
                    <th className="table-header-cell">Son Giriş</th>
                    <th className="table-header-cell">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {filteredStudents.map((student, index) => (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="table-row"
                    >
                      <td className="table-cell">
                        <div className="student-cell">
                          <div className="student-avatar-small">
                            {student.adSoyad.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="student-cell-info">
                            <div className="student-name">{student.adSoyad}</div>
                            <div className="student-number">{student.ogrenciNo}</div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">{student.sinif}</td>
                      <td className="table-cell">
                        <span className={getGradeColor(student.notOrtalamasi || 0)}>
                          {student.notOrtalamasi?.toFixed(1) || 'N/A'}
                        </span>
                      </td>
                      <td className="table-cell">{student.devamsizlik}</td>
                      <td className="table-cell">
                        <span className={`status-badge ${getStatusColor(student.durum)}`}>
                          {student.durum.charAt(0).toUpperCase() + student.durum.slice(1)}
                        </span>
                      </td>
                      <td className="table-cell">{student.sonGiris}</td>
                      <td className="table-cell">
                        <div className="table-actions">
                          <button className="table-action-button">
                            <Eye className="action-icon" />
                          </button>
                          <button className="table-action-button">
                            <MessageSquare className="action-icon" />
                          </button>
                          <button className="table-action-button">
                            <Edit className="action-icon" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Class Statistics */}

        {/* Export and Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="actions-section"
        >
          <div className="actions-left">
            <button className="btn btn-primary">
              <Plus className="btn-icon" />
              Yeni Öğrenci Ekle
            </button>
            <button className="btn btn-secondary">
              <Download className="btn-icon" />
              Excel'e Aktar
            </button>
          </div>
          
          <div className="actions-info">
            Toplam {filteredStudents.length} öğrenci gösteriliyor
          </div>
        </motion.div>
      </div>
      </div>
    </ModernDashboardLayout>
  );
}
