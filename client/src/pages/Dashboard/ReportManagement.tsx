import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit, 
  Trash2,
  Eye,
  Calendar,
  User,
  BarChart3,
  Settings,
  RefreshCw,
  MoreVertical
} from 'lucide-react';
import { SecureAPI } from '../../utils/api';
import { useAuthContext } from '../../contexts/AuthContext';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import './ReportManagement.css';

interface Report {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  status: string;
  generatedBy: string;
  generatedAt: string;
  isPublic: boolean;
  allowedRoles: string[];
  isActive: boolean;
  data: {
    charts: any[];
    tables: any[];
  };
}

interface CreateReportForm {
  title: string;
  description: string;
  type: string;
  category: string;
  template: string;
  filters: {
    startDate: string;
    endDate: string;
    classLevel: string;
    classSection: string;
    subject: string;
    teacherId: string;
    studentId: string;
    role: string;
    clubId: string;
    academicYear: string;
    semester: string;
  };
  schedule: {
    frequency: string;
    nextRun: string;
    recipients: string[];
    emailTemplate: string;
  };
}

const ReportManagement: React.FC = () => {
  // All hooks must be called unconditionally at the top level
  const { user } = useAuthContext();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState<CreateReportForm>({
    title: '',
    description: '',
    type: '',
    category: '',
    template: 'default',
    filters: {
      startDate: '',
      endDate: '',
      classLevel: '',
      classSection: '',
      subject: '',
      teacherId: '',
      studentId: '',
      role: '',
      clubId: '',
      academicYear: '',
      semester: ''
    },
    schedule: {
      frequency: 'manual',
      nextRun: '',
      recipients: [],
      emailTemplate: ''
    }
  });

  const fetchReports = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
        ...(filterType && { type: filterType }),
        ...(filterStatus && { status: filterStatus })
      });

      const response = await SecureAPI.get(`/analytics/reports?${params.toString()}`) as any;
      
      if (response.data.success) {
        setReports(response.data.data.reports);
        setTotalPages(response.data.data.pagination.pages);
        setCurrentPage(response.data.data.pagination.page);
      } else {
        setError('Raporlar yüklenirken hata oluştu');
      }
    } catch (err: any) {
      console.error('Reports fetch error:', err);
      setError(err.message || 'Raporlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, filterType, filterStatus]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Move all hooks before any conditional returns
  const breadcrumb = useMemo(() => [
    { label: 'Ana Sayfa', path: '/' },
    { label: 'Rapor Yönetimi' }
  ], []);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await SecureAPI.post('/analytics/reports', formData) as any;

      if (response.data.success) {
        alert('Rapor başarıyla oluşturuldu!');
        setShowCreateForm(false);
        setFormData({
          title: '',
          description: '',
          type: '',
          category: '',
          template: 'default',
          filters: {
            startDate: '',
            endDate: '',
            classLevel: '',
            classSection: '',
            subject: '',
            teacherId: '',
            studentId: '',
            role: '',
            clubId: '',
            academicYear: '',
            semester: ''
          },
          schedule: {
            frequency: 'manual',
            nextRun: '',
            recipients: [],
            emailTemplate: ''
          }
        });
        fetchReports();
      }
    } catch (err: any) {
      console.error('Report creation error:', err);
      alert('Rapor oluşturulurken hata oluştu');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Bu raporu silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await SecureAPI.delete(`/analytics/reports/${reportId}`) as any;

      if (response.data.success) {
        alert('Rapor başarıyla silindi!');
        fetchReports();
      }
    } catch (err: any) {
      console.error('Report deletion error:', err);
      alert('Rapor silinirken hata oluştu');
    }
  };

  const handleExportReport = async (reportId: string, format = 'pdf') => {
    try {
      const response = await SecureAPI.get(`/analytics/reports/${reportId}/export?format=${format}`) as any;

      if (response.data.success) {
        // In a real implementation, this would trigger a download
        alert(`${format.toUpperCase()} formatında rapor hazırlandı!`);
      }
    } catch (err: any) {
      console.error('Report export error:', err);
      alert('Rapor dışa aktarılırken hata oluştu');
    }
  };

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'academic': return <BarChart3 size={20} />;
      case 'user': return <User size={20} />;
      case 'club': return <BarChart3 size={20} />;
      case 'system': return <Settings size={20} />;
      default: return <FileText size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generated': return 'success';
      case 'draft': return 'warning';
      case 'scheduled': return 'info';
      case 'archived': return 'secondary';
      default: return 'default';
    }
  };

  const ReportCard: React.FC<{ report: Report }> = React.memo(({ report }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="report-card"
    >
      <div className="report-header">
        <div className="report-icon">
          {getReportIcon(report.type)}
        </div>
        <div className="report-info">
          <h3 className="report-title">{report.title}</h3>
          <p className="report-description">{report.description}</p>
          <div className="report-meta">
            <span className="report-type">{report.type}</span>
            <span className="report-category">{report.category}</span>
            <span className={`report-status ${getStatusColor(report.status)}`}>
              {report.status}
            </span>
          </div>
        </div>
        <div className="report-actions">
          <button 
            className="btn-icon"
            onClick={() => setSelectedReport(report)}
          >
            <Eye size={16} />
          </button>
          <button 
            className="btn-icon"
            onClick={() => handleExportReport(report.id, 'pdf')}
          >
            <Download size={16} />
          </button>
          <button 
            className="btn-icon"
            onClick={() => handleDeleteReport(report.id)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="report-footer">
        <div className="report-details">
          <span className="report-author">
            <User size={14} />
            {report.generatedBy}
          </span>
          <span className="report-date">
            <Calendar size={14} />
            {new Date(report.generatedAt).toLocaleDateString('tr-TR')}
          </span>
        </div>
        <div className="report-visibility">
          {report.isPublic ? 'Herkese Açık' : 'Özel'}
        </div>
      </div>
    </motion.div>
  ));

  const CreateReportModal: React.FC = () => (
    <AnimatePresence>
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay"
          onClick={() => setShowCreateForm(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Yeni Rapor Oluştur</h2>
              <button 
                className="close-btn"
                onClick={() => setShowCreateForm(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateReport} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Rapor Başlığı *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Açıklama</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>Rapor Türü *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    required
                  >
                    <option value="">Seçiniz</option>
                    <option value="academic">Akademik</option>
                    <option value="user">Kullanıcı</option>
                    <option value="club">Kulüp</option>
                    <option value="system">Sistem</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Kategori *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    required
                  >
                    <option value="">Seçiniz</option>
                    <option value="dashboard">Dashboard</option>
                    <option value="performance">Performans</option>
                    <option value="activity">Aktivite</option>
                    <option value="summary">Özet</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={formData.filters.startDate}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      filters: { ...prev.filters, startDate: e.target.value }
                    }))}
                  />
                </div>
                <div className="form-group">
                  <label>Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={formData.filters.endDate}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      filters: { ...prev.filters, endDate: e.target.value }
                    }))}
                  />
                </div>
                <div className="form-group">
                  <label>Sınıf Seviyesi</label>
                  <select
                    value={formData.filters.classLevel}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      filters: { ...prev.filters, classLevel: e.target.value }
                    }))}
                  >
                    <option value="">Tümü</option>
                    <option value="9">9. Sınıf</option>
                    <option value="10">10. Sınıf</option>
                    <option value="11">11. Sınıf</option>
                    <option value="12">12. Sınıf</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Şube</label>
                  <select
                    value={formData.filters.classSection}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      filters: { ...prev.filters, classSection: e.target.value }
                    }))}
                  >
                    <option value="">Tümü</option>
                    <option value="A">A Şubesi</option>
                    <option value="B">B Şubesi</option>
                    <option value="C">C Şubesi</option>
                    <option value="D">D Şubesi</option>
                    <option value="E">E Şubesi</option>
                    <option value="F">F Şubesi</option>
                  </select>
                </div>
              </div>
            </form>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                İptal
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                onClick={handleCreateReport}
              >
                Rapor Oluştur
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const ReportDetailModal: React.FC = () => (
    <AnimatePresence>
      {selectedReport && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay"
          onClick={() => setSelectedReport(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="modal-content large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{selectedReport.title}</h2>
              <button 
                className="close-btn"
                onClick={() => setSelectedReport(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="report-detail-info">
                <p className="report-detail-description">{selectedReport.description}</p>
                <div className="report-detail-meta">
                  <div className="meta-item">
                    <strong>Tür:</strong> {selectedReport.type}
                  </div>
                  <div className="meta-item">
                    <strong>Kategori:</strong> {selectedReport.category}
                  </div>
                  <div className="meta-item">
                    <strong>Durum:</strong> {selectedReport.status}
                  </div>
                  <div className="meta-item">
                    <strong>Oluşturan:</strong> {selectedReport.generatedBy}
                  </div>
                  <div className="meta-item">
                    <strong>Tarih:</strong> {new Date(selectedReport.generatedAt).toLocaleString('tr-TR')}
                  </div>
                </div>
              </div>
              
              {selectedReport.data.charts && selectedReport.data.charts.length > 0 && (
                <div className="report-charts">
                  <h3>Grafikler</h3>
                  <div className="charts-grid">
                    {selectedReport.data.charts.map((chart, index) => (
                      <div key={index} className="chart-container">
                        <h4>{chart.options?.plugins?.title?.text || `Grafik ${index + 1}`}</h4>
                        <div className="chart-placeholder">
                          <BarChart3 size={48} />
                          <p>{chart.type} grafiği</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedReport.data.tables && selectedReport.data.tables.length > 0 && (
                <div className="report-tables">
                  <h3>Tablolar</h3>
                  {selectedReport.data.tables.map((table, index) => (
                    <div key={index} className="table-container">
                      <h4>Tablo {index + 1}</h4>
                      <table className="data-table">
                        <thead>
                          <tr>
                            {table.headers.map((header: string, i: number) => (
                              <th key={i}>{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {table.rows.slice(0, 10).map((row: any[], i: number) => (
                            <tr key={i}>
                              {row.map((cell: any, j: number) => (
                                <td key={j}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {table.rows.length > 10 && (
                        <p className="table-note">
                          ... ve {table.rows.length - 10} satır daha
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => handleExportReport(selectedReport.id, 'pdf')}
              >
                <Download size={16} />
                PDF İndir
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => setSelectedReport(null)}
              >
                Kapat
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (loading) {
    return (
      <div className="report-management">
        <div className="loading-state">
          <RefreshCw className="spinner" size={32} />
          <p>Raporlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  const headerActions = (
    <div className="header-actions">
      <button 
        className="btn btn-primary"
        onClick={() => setShowCreateForm(true)}
      >
        <Plus size={16} />
        Yeni Rapor
      </button>
    </div>
  );

  return (
    <ModernDashboardLayout
      pageTitle="Rapor Yönetimi"
      breadcrumb={breadcrumb}
      customHeaderActions={headerActions}
    >
      <div className="report-management">
        <div className="page-description">
          <p>Raporları görüntüle, oluştur ve yönet</p>
        </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Rapor ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-controls">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">Tüm Türler</option>
              <option value="academic">Akademik</option>
              <option value="user">Kullanıcı</option>
              <option value="club">Kulüp</option>
              <option value="system">Sistem</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Tüm Durumlar</option>
              <option value="generated">Oluşturuldu</option>
              <option value="draft">Taslak</option>
              <option value="scheduled">Planlandı</option>
              <option value="archived">Arşivlendi</option>
            </select>
            <button 
              className="btn btn-secondary"
              onClick={() => fetchReports()}
            >
              <RefreshCw size={16} />
              Yenile
            </button>
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="reports-section">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Raporlar yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>Hata: {error}</p>
            <button onClick={() => fetchReports()} className="btn btn-primary">
              Tekrar Dene
            </button>
          </div>
        ) : reports.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <h3>Henüz rapor yok</h3>
            <p>İlk raporunuzu oluşturmak için "Yeni Rapor" butonuna tıklayın.</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus size={16} />
              İlk Raporu Oluştur
            </button>
          </div>
        ) : (
          <div className="reports-grid">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            className="btn btn-secondary"
            disabled={currentPage === 1}
            onClick={() => fetchReports(currentPage - 1)}
          >
            Önceki
          </button>
          <span className="page-info">
            Sayfa {currentPage} / {totalPages}
          </span>
          <button 
            className="btn btn-secondary"
            disabled={currentPage === totalPages}
            onClick={() => fetchReports(currentPage + 1)}
          >
            Sonraki
          </button>
        </div>
      )}

        {/* Modals */}
        <CreateReportModal />
        <ReportDetailModal />
      </div>
    </ModernDashboardLayout>
  );
};

export default ReportManagement;
