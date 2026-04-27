import { useMemo } from 'react';
import { BookOpen, AlertCircle, User, GraduationCap } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useNotes } from '../../hooks/queries/noteQueries';
import GradeTrendChart from '../../components/charts/GradeTrendChart';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';

import './NotlarPage.css';

export interface NoteEntry {
  _id?: string;
  id: string;
  studentName: string;
  lesson: string;
  exam1: number;
  exam2: number;
  oral: number;
  average: number;
  teacherName?: string;
  semester?: string;
  gradeLevel?: string;
  classSection?: string;
}

function getAverageClass(avg: number): string {
  if (avg >= 85) return 'excellent';
  if (avg >= 70) return 'good';
  if (avg >= 50) return 'average';
  return 'poor';
}

export default function NotlarPage() {
  const { user } = useAuthContext();
  const { data, isLoading, error, refetch } = useNotes();
  // The backend returns `_id` only (Mongo's ObjectId), while the local
  // `NoteEntry` interface declares `id` as required. Unwrap through
  // `unknown` so the two shapes stay loosely coupled — the downstream
  // rendering code only reads the numeric fields.
  const notes: NoteEntry[] = (data?.data as unknown as NoteEntry[]) || [];

  const showChart = useMemo(() => {
    if (!user || (user.rol !== 'student' && user.rol !== 'parent')) return false;
    const semesterSet = new Set(notes.map((n) => n.semester).filter(Boolean));
    return semesterSet.size >= 2;
  }, [user, notes]);

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Notlarım' },
  ];

  if (isLoading) {
    return (
      <ModernDashboardLayout pageTitle="Notlarım" breadcrumb={breadcrumb}>
        <div className="notlar-page">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Notlar yükleniyor...</p>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  if (error) {
    return (
      <ModernDashboardLayout pageTitle="Notlarım" breadcrumb={breadcrumb}>
        <div className="notlar-page">
          <div className="error-message">
            <AlertCircle className="error-icon" />
            <p>Notlar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.</p>
            <button onClick={() => refetch()} className="btn-blue">
              Tekrar Dene
            </button>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout pageTitle="Notlarım" breadcrumb={breadcrumb}>
      <div className="notlar-page">
        <div className="page-header">
          <div className="page-header-content">
            <div className="page-title-section">
              <BookOpen className="page-icon" />
              <h2 className="page-title-main">Notlarım</h2>
            </div>
          </div>
        </div>

        {showChart && <GradeTrendChart notes={notes} />}

        <div className="notlar-page-content">
          {notes.length === 0 ? (
            <div className="empty-state">
              <BookOpen className="empty-icon" />
              <h3>Henüz not bulunmuyor</h3>
              <p>Notlarınız açıklandığında burada görünecektir.</p>
            </div>
          ) : (
            <div className="dashboard-grid">
              {notes.map((note) => (
                <div key={note._id || note.id} className="dashboard-card">
                  <div className="card-header">
                    <div className="card-icon">
                      <BookOpen className="icon" size={24} />
                    </div>
                    <div className="card-badge">
                      <span className={`note-average ${getAverageClass(note.average)}`}>
                        {note.average.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="card-content">
                    <h3 className="note-title">{note.lesson}</h3>
                    <div className="note-meta">
                      <span className="note-student">
                        <User size={14} />
                        {note.studentName}
                      </span>
                      {note.gradeLevel && (
                        <span className="note-class">
                          <GraduationCap size={14} />
                          {note.gradeLevel}/{note.classSection}
                        </span>
                      )}
                    </div>
                    <div className="note-scores">
                      <div className="score-item">
                        <span className="score-label">1. Sınav</span>
                        <span className="score-value">{note.exam1}</span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">2. Sınav</span>
                        <span className="score-value">{note.exam2}</span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">Sözlü</span>
                        <span className="score-value">{note.oral}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModernDashboardLayout>
  );
}
