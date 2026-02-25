import { useEffect, useState } from 'react';
import { BookOpen, AlertCircle, User, GraduationCap } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { NotesService } from '../../utils/apiService';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';

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

function getAverageClass(average: number): string {
    if (average >= 85) return 'excellent';
    if (average >= 70) return 'good';
    if (average >= 50) return 'average';
    return 'poor';
}

export default function NotlarPage() {
    const { user } = useAuthContext();

    const [notes, setNotes] = useState<NoteEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNotes = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Server handles role-based filtering - no client-side filtering needed
                const { data, error } = await NotesService.getNotes();
                if (error) {
                    throw new Error(error);
                }
                setNotes((data as NoteEntry[]) || []);
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

    const breadcrumb = [
        { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
        { label: 'Notlarım' }
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
                        <p>{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="btn-blue"
                        >
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
                                            <span className={`note-average ${getAverageClass(note.ortalama)}`}>
                                                {note.ortalama.toFixed(1)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="card-content">
                                        <h3 className="note-title">{note.ders}</h3>
                                        <div className="note-meta">
                                            <span className="note-student">
                                                <User size={14} />
                                                {note.adSoyad}
                                            </span>
                                            {note.sinif && (
                                                <span className="note-class">
                                                    <GraduationCap size={14} />
                                                    {note.sinif}/{note.sube}
                                                </span>
                                            )}
                                        </div>
                                        <div className="note-scores">
                                            <div className="score-item">
                                                <span className="score-label">1. Sınav</span>
                                                <span className="score-value">{note.sinav1}</span>
                                            </div>
                                            <div className="score-item">
                                                <span className="score-label">2. Sınav</span>
                                                <span className="score-value">{note.sinav2}</span>
                                            </div>
                                            <div className="score-item">
                                                <span className="score-label">Sözlü</span>
                                                <span className="score-value">{note.sozlu}</span>
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
