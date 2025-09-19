import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { NotesService } from '../../utils/apiService';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import BackButton from '../../components/BackButton';
import './NotlarPage.css';

interface NoteEntry {
  _id?: string;
  id: string;
  adSoyad: string;
  ders: string;
  sinav1: number;
  sinav2: number;
  sozlu: number;
  ortalama: number;
  giren?: string;
  donem?: string;
  sinif?: string;
  sube?: string;
}

// removed unused UserRole and AuthUser interface

function getAverageClass(average: number): string {
  if (average >= 85) return 'excellent';
  if (average >= 70) return 'good';
  if (average >= 50) return 'average';
  return 'poor';
}

export default function NotlarPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Notes data will be fetched from API

  useEffect(() => {
    const fetchNotes = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch notes based on user role
        let all: NoteEntry[] = [];
        
        if (user?.rol === 'student') {
          const { data, error } = await NotesService.getNotes();
          if (error) {
            throw new Error(error);
          }
          all = (data as any[]).filter((note: any) => note.studentId === user.id);
        } else if (user?.rol === 'parent' && (user as any).childId) {
          const { data, error } = await NotesService.getNotes();
          if (error) {
            throw new Error(error);
          }
          const childIds = Array.isArray((user as any).childId) ? (user as any).childId : [(user as any).childId];
          all = (data as any[]).filter((note: any) => childIds.includes(note.studentId));
        } else if (user?.rol === 'teacher') {
          const { data, error } = await NotesService.getNotes();
          if (error) {
            throw new Error(error);
          }
          all = (data as any[]).filter((note: any) => note.teacherId === user.id);
        }
        
        setNotes(all);
      } catch (error) {
        console.error('Error fetching notes:', error);
        setError('Notlar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.');
        toast.error('Notlar yüklenirken hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchNotes();
    }
  }, [user]);
  
  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      setNotes([]);
      toast.success('Notlar yenilendi');
    } catch (error) {
      console.error('Error refreshing notes:', error);
      setError('Notlar yenilenirken bir hata oluştu.');
      toast.error('Notlar yenilenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="centered-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Notlarım' }
  ];

  if (error) {
    return (
      <ModernDashboardLayout
        pageTitle="Notlarım"
        breadcrumb={breadcrumb}
      >
        <div className="error-message">
          <AlertCircle className="error-icon" />
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-blue"
          >
            Tekrar Dene
          </button>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout
      pageTitle="Notlarım"
      breadcrumb={breadcrumb}
    >
      <div className="welcome-section">
        <BackButton />
        <div className="welcome-card">
          <div className="welcome-content">
            <div className="welcome-text">
              <h2>Notlarım</h2>
              <p>Ders notlarınızı buradan görüntüleyebilirsiniz.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {notes.length === 0 ? (
          <div className="empty-state">
            <BookOpen className="empty-icon" />
            <h3>Henüz not bulunmuyor</h3>
            <p>Notlarınız burada görünecektir.</p>
          </div>
        ) : (
          <div className="dashboard-grid">
            {notes.map((note) => (
              <div key={note._id || note.id} className="dashboard-card">
                <div className="card-header">
                  <div className="card-icon">
                    <BookOpen className="icon" />
                  </div>
                  <div className="card-badge">
                    <span className={`note-average ${getAverageClass(note.ortalama)}`}>
                      {note.ortalama.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="card-content">
                  <h3 className="note-title">{note.ders}</h3>
                  <div className="note-meta">
                    <span className="note-student">{note.adSoyad}</span>
                    {note.sinif && <span className="note-class">{note.sinif}</span>}
                  </div>
                  <div className="note-scores">
                    <div className="score-item">
                      <span className="score-label">1. Sınav:</span>
                      <span className="score-value">{note.sinav1}</span>
                    </div>
                    <div className="score-item">
                      <span className="score-label">2. Sınav:</span>
                      <span className="score-value">{note.sinav2}</span>
                    </div>
                    <div className="score-item">
                      <span className="score-label">Sözlü:</span>
                      <span className="score-value">{note.sozlu}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModernDashboardLayout>
  );
}
