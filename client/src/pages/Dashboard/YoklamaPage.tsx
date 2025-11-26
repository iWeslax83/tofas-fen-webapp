import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ClipboardList, Users, Calendar, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import BackButton from '../../components/BackButton';
import axios from 'axios';

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  date: string;
  lesson?: string;
  period?: number;
  attendanceType: 'ders' | 'etut' | 'gece_nobeti';
  status: 'present' | 'absent' | 'late' | 'excused';
  excuse?: string;
  notes?: string;
}

interface Student {
  id: string;
  adSoyad: string;
  sinif?: string;
  sube?: string;
}

const YoklamaPage: React.FC = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [attendanceType, setAttendanceType] = useState<'ders' | 'etut' | 'gece_nobeti'>('ders');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [lesson, setLesson] = useState('');
  const [period, setPeriod] = useState<number>(1);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Record<string, 'present' | 'absent' | 'late' | 'excused'>>({});
  const [singleStudentId, setSingleStudentId] = useState('');
  const [singleStatus, setSingleStatus] = useState<'present' | 'absent' | 'late' | 'excused'>('present');
  const [excuse, setExcuse] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [semester, setSemester] = useState('1');
  const [academicYear, setAcademicYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);

  useEffect(() => {
    if (!user || !['teacher', 'admin'].includes(user.rol || '')) {
      navigate('/login');
      return;
    }

    // Load students
    loadStudents();
  }, [user, navigate]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/user?role=student', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        setStudents(response.data);
      } else if (response.data?.users) {
        setStudents(response.data.users);
      }
    } catch (error: any) {
      console.error('Error loading students:', error);
      toast.error('Öğrenciler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatusChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setSelectedStudents(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!singleStudentId) {
      toast.error('Lütfen bir öğrenci seçin');
      return;
    }

    if (!date) {
      toast.error('Lütfen bir tarih seçin');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post('/api/attendance', {
        studentId: singleStudentId,
        date,
        lesson: attendanceType === 'ders' ? lesson : undefined,
        period: attendanceType === 'ders' ? period : undefined,
        attendanceType,
        status: singleStatus,
        excuse: singleStatus === 'excused' ? excuse : undefined,
        notes,
        semester,
        academicYear
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success('Yoklama kaydı oluşturuldu');
        // Reset form
        setSingleStudentId('');
        setSingleStatus('present');
        setExcuse('');
        setNotes('');
      }
    } catch (error: any) {
      console.error('Error submitting attendance:', error);
      toast.error(error.response?.data?.error || 'Yoklama kaydı oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (Object.keys(selectedStudents).length === 0) {
      toast.error('Lütfen en az bir öğrenci seçin');
      return;
    }

    if (!date) {
      toast.error('Lütfen bir tarih seçin');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post('/api/attendance/bulk', {
        studentIds: Object.keys(selectedStudents),
        date,
        lesson: attendanceType === 'ders' ? lesson : undefined,
        period: attendanceType === 'ders' ? period : undefined,
        attendanceType,
        statuses: selectedStudents,
        semester,
        academicYear
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success(`${response.data.created} yeni kayıt oluşturuldu, ${response.data.updated} kayıt güncellendi`);
        // Reset form
        setSelectedStudents({});
      }
    } catch (error: any) {
      console.error('Error submitting bulk attendance:', error);
      toast.error(error.response?.data?.error || 'Yoklama kayıtları oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'absent':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'late':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'excused':
        return <FileText className="w-5 h-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present':
        return 'Geldi';
      case 'absent':
        return 'Gelmedi';
      case 'late':
        return 'Geç Geldi';
      case 'excused':
        return 'Mazeretli';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <ModernDashboardLayout pageTitle="Yoklama Girişi" breadcrumb={[{ label: 'Ana Sayfa', path: `/${user?.rol}` }, { label: 'Yoklama Girişi' }]}>
        <div className="centered-spinner">
          <div className="spinner"></div>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout
      pageTitle="Yoklama Girişi"
      breadcrumb={[
        { label: 'Ana Sayfa', path: `/${user?.rol}` },
        { label: 'Yoklama Girişi' }
      ]}
    >
      <BackButton />
      
      <div className="dashboard-content" style={{ padding: '20px' }}>
        {/* Tabs */}
        <div className="tabs-container" style={{ marginBottom: '20px' }}>
          <ul className="tabs-header" style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e5e7eb' }}>
            <li>
              <button
                onClick={() => setActiveTab('single')}
                className={`tab-button ${activeTab === 'single' ? 'active' : ''}`}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: 'transparent',
                  borderBottom: activeTab === 'single' ? '2px solid #3b82f6' : '2px solid transparent',
                  cursor: 'pointer',
                  color: activeTab === 'single' ? '#3b82f6' : '#6b7280'
                }}
              >
                Tekil Yoklama
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('bulk')}
                className={`tab-button ${activeTab === 'bulk' ? 'active' : ''}`}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: 'transparent',
                  borderBottom: activeTab === 'bulk' ? '2px solid #3b82f6' : '2px solid transparent',
                  cursor: 'pointer',
                  color: activeTab === 'bulk' ? '#3b82f6' : '#6b7280'
                }}
              >
                Toplu Yoklama
              </button>
            </li>
          </ul>
        </div>

        {/* Common Form Fields */}
        <div className="form-section" style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            <div className="form-group">
              <label className="form-label">Yoklama Türü</label>
              <select
                className="form-input"
                value={attendanceType}
                onChange={(e) => setAttendanceType(e.target.value as any)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              >
                <option value="ders">Ders Yoklaması</option>
                <option value="etut">Etüt Yoklaması</option>
                <option value="gece_nobeti">Gece Nöbeti Yoklaması</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tarih</label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
            </div>

            {attendanceType === 'ders' && (
              <>
                <div className="form-group">
                  <label className="form-label">Ders</label>
                  <input
                    type="text"
                    className="form-input"
                    value={lesson}
                    onChange={(e) => setLesson(e.target.value)}
                    placeholder="Ders adı"
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ders Saati</label>
                  <select
                    className="form-input"
                    value={period}
                    onChange={(e) => setPeriod(parseInt(e.target.value))}
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                      <option key={p} value={p}>{p}. Saat</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Dönem</label>
              <select
                className="form-input"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              >
                <option value="1">1. Dönem</option>
                <option value="2">2. Dönem</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Akademik Yıl</label>
              <input
                type="text"
                className="form-input"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2024-2025"
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
            </div>
          </div>
        </div>

        {/* Single Attendance Form */}
        {activeTab === 'single' && (
          <form onSubmit={handleSubmitSingle} className="form-section" style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>Tekil Yoklama Girişi</h3>
            
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Öğrenci</label>
                <select
                  className="form-input"
                  value={singleStudentId}
                  onChange={(e) => setSingleStudentId(e.target.value)}
                  required
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="">Öğrenci seçin</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.adSoyad} {student.sinif && student.sube ? `(${student.sinif}${student.sube})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Durum</label>
                <select
                  className="form-input"
                  value={singleStatus}
                  onChange={(e) => setSingleStatus(e.target.value as any)}
                  required
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="present">Geldi</option>
                  <option value="absent">Gelmedi</option>
                  <option value="late">Geç Geldi</option>
                  <option value="excused">Mazeretli</option>
                </select>
              </div>
            </div>

            {singleStatus === 'excused' && (
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label className="form-label">Mazeret Açıklaması</label>
                <textarea
                  className="form-input"
                  value={excuse}
                  onChange={(e) => setExcuse(e.target.value)}
                  placeholder="Mazeret açıklaması"
                  rows={3}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', width: '100%' }}
                />
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label className="form-label">Notlar (Opsiyonel)</label>
              <textarea
                className="form-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ek notlar"
                rows={2}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', width: '100%' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="submit-button"
              style={{
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                fontWeight: '500'
              }}
            >
              {submitting ? 'Kaydediliyor...' : 'Yoklama Kaydet'}
            </button>
          </form>
        )}

        {/* Bulk Attendance Form */}
        {activeTab === 'bulk' && (
          <form onSubmit={handleSubmitBulk} className="form-section" style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>Toplu Yoklama Girişi</h3>
            
            <div style={{ marginBottom: '20px', maxHeight: '500px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px' }}>
              {students.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>Öğrenci bulunamadı</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Öğrenci</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Geldi</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Gelmedi</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Geç Geldi</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Mazeretli</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => (
                      <tr key={student.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px' }}>
                          {student.adSoyad} {student.sinif && student.sube ? `(${student.sinif}${student.sube})` : ''}
                        </td>
                        {(['present', 'absent', 'late', 'excused'] as const).map(status => (
                          <td key={status} style={{ padding: '10px', textAlign: 'center' }}>
                            <input
                              type="radio"
                              name={`status-${student.id}`}
                              checked={selectedStudents[student.id] === status}
                              onChange={() => handleBulkStatusChange(student.id, status)}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || Object.keys(selectedStudents).length === 0}
              className="submit-button"
              style={{
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: submitting || Object.keys(selectedStudents).length === 0 ? 'not-allowed' : 'pointer',
                opacity: submitting || Object.keys(selectedStudents).length === 0 ? 0.7 : 1,
                fontWeight: '500'
              }}
            >
              {submitting ? 'Kaydediliyor...' : `Yoklama Kaydet (${Object.keys(selectedStudents).length} öğrenci)`}
            </button>
          </form>
        )}
      </div>
    </ModernDashboardLayout>
  );
};

export default YoklamaPage;

