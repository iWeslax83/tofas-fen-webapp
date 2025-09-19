import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { SecureAPI } from "../../utils/api";
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import BackButton from '../../components/BackButton';
import './DersProgramiPage.css';
import { 
  BookOpen, 
  Clock
} from 'lucide-react';
import scheduleData from './DersProgramlari.json';
import { toast } from 'sonner';

// Type definitions for the schedule data
interface DaySchedule {
  Pazartesi?: string[];
  Salı?: string[];
  Çarşamba?: string[];
  Perşembe?: string[];
  Cuma?: string[];
  [key: string]: string[] | undefined; // Index signature for dynamic access
}

interface ClassSchedule {
  [key: string]: DaySchedule;
}

interface User {
  id: string;
  adSoyad: string;
  email: string;
  rol: string;
  sinif?: string;
  sube?: string;
  childId?: string | string[];
  childrenSiniflar?: { sinif: string; sube: string }[];
}

interface Schedule {
  [key: string]: ClassSchedule;  
}

// Type assertion for the imported JSON data
const schedules = scheduleData as unknown as Schedule;

export default function DersProgramiPage() {
  const { user: authUser } = useAuth(["admin", "teacher", "student", "parent"]);
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<{ sinif: string; sube: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({}); // Not used
  
  // Safely access the schedule data with type checking
  const getClassSchedule = (sinif: string, sube: string): DaySchedule | null => {
    const classData = schedules[sinif];
    if (!classData) return null;
    return classData[sube] || null;
  };
  
  // Helper to get day names in correct order
  const getDayNames = (): string[] => {
    return ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
  };
 

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching user data for ders programı...');
      const res = await SecureAPI.get('/api/auth/me');
      console.log('📡 API Response:', res);
      
      const userData = (res as { data: User }).data;
      if (!userData || !["admin", "teacher", "student", "parent"].includes(userData.rol)) {
        setError("Bu sayfaya erişim yetkiniz bulunmuyor.");
        return;
      }
      
      setUser(userData);
      let allClasses: { sinif: string; sube: string; label: string }[] = [];
      
      // For students, show their own class
      if (userData.rol === "student" && userData.sinif && userData.sube) {
        allClasses.push({ 
          sinif: userData.sinif, 
          sube: userData.sube, 
          label: `${userData.sinif}/${userData.sube} - ${userData.adSoyad}` 
        });
      }
      
      // For parents, show their children's classes
      if (userData.rol === "parent" && userData.childrenSiniflar) {
        userData.childrenSiniflar.forEach((child: { sinif: string; sube: string }) => {
          allClasses.push({
            sinif: child.sinif,
            sube: child.sube,
            label: `${child.sinif}/${child.sube} - ${(child as any).adSoyad || 'Çocuk'}`
          });
        });
      }
      
      // For teachers/admins, allow selecting any class
      if (["teacher", "admin"].includes(userData.rol)) {
        // This would be populated from an API in a real app
        allClasses = [
          { sinif: "9", sube: "A", label: "9/A Sınıfı" },
          { sinif: "9", sube: "B", label: "9/B Sınıfı" },
          { sinif: "10", sube: "A", label: "10/A Sınıfı" },
          { sinif: "10", sube: "B", label: "10/B Sınıfı" },
          { sinif: "11", sube: "A", label: "11/A Sınıfı" },
          { sinif: "11", sube: "B", label: "11/B Sınıfı" },
          { sinif: "12", sube: "A", label: "12/A Sınıfı" },
          { sinif: "12", sube: "B", label: "12/B Sınıfı" },
        ];
      }
      
      console.log('✅ Classes set:', allClasses);
      setClasses(allClasses);
      setError(null);
    } catch (err) {
      console.error("❌ Error fetching user data:", err);
      setError("Kullanıcı bilgileri yüklenirken bir hata oluştu.");
      toast.error("Ders programı yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser) {
      fetchUserData();
    }
  }, [authUser, fetchUserData]);
  
  // const toggleDay = (day: string) => { // Not used
  //   setExpandedDays(prev => ({
  //     ...prev,
  //     [day]: !prev[day]
  //   }));
  // };
  
  // const handlePrint = () => { // Not used
  //   window.print();
  // };
  

  if (loading) {
    return (
      <div className="admin-panel">
        <header className="panel-header">
          <div className="header-left">
            <div className="panel-logo">
              <div className="panel-logo-icon">
                <BookOpen className="icon" />
              </div>
              <div className="panel-logo-text">
                <div className="school-info">
                  <h1 className="school-name">Tofaş Fen Lisesi</h1>
                  <p className="page-title">Ders Programı</p>
                </div>
              </div>
            </div>
          </div>
          <div className="header-right">
            {/* User menu removed - handled by ModernDashboardLayout */}
          </div>
        </header>

        <main className="panel-main">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Ders programı yükleniyor...</p>
          </div>
        </main>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="admin-panel">
        <header className="panel-header">
          <div className="header-left">
            <div className="panel-logo">
              <div className="panel-logo-icon">
                <BookOpen className="icon" />
              </div>
              <div className="panel-logo-text">
                <div className="school-info">
                  <h1 className="school-name">Tofaş Fen Lisesi</h1>
                  <p className="page-title">Ders Programı</p>
                </div>
              </div>
            </div>
          </div>
          <div className="header-right">
            {/* User menu removed - handled by ModernDashboardLayout */}
          </div>
        </header>

        <main className="panel-main">
          <div className="error-container">
            <div className="error-message">
              <h2>Hata Oluştu</h2>
              <p>{error}</p>
              <button onClick={fetchUserData} className="btn btn-primary mt-4">
                Tekrar Dene
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Ders Programı' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Ders Programı"
      breadcrumb={breadcrumb}
    >
      <div className="ders-programi-page">
        <BackButton />
        <main className="panel-main">
        <div className="page-content">
          
          <div className="page-header">
            <div className="page-header-content">
              <div className="page-title-section">
                <BookOpen className="page-icon" />
                <h2 className="page-title-main">Ders Programı</h2>
              </div>
            </div>
          </div>

        <div className="ders-programi-container">
          {classes.length === 0 ? (
            <div className="empty-state">
              <BookOpen className="empty-icon" />
              <h3>Ders programı bulunamadı</h3>
              <p>Sistemde kayıtlı ders programı bulunmuyor.</p>
            </div>
          ) : (
            <div className="timetable-grid">
              {classes.map(({ sinif, sube, label }) => {
                const schedule = getClassSchedule(sinif, sube);
                if (!schedule) return null;
                
                return (
                  <div key={`${sinif}-${sube}`} className="class-schedule-card">
                    <div className="class-header">
                      <div className="class-info">
                        <div className="class-icon">
                          <BookOpen size={24} />
                        </div>
                        <div className="class-details">
                          <h3 className="class-title">{label}</h3>
                          <p className="class-subtitle">{sinif}. Sınıf - {sube} Şubesi</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="schedule-grid">
                      {getDayNames().map(day => {
                        if (!schedule[day]) return null;
                        const lessons = schedule[day] || [];
                        return (
                          <div key={day} className="day-column">
                            <div className="day-header">
                              <h4 className="day-name">{day}</h4>
                              <span className="lesson-count">{lessons.length} ders</span>
                            </div>
                            <div className="lessons-list">
                              {lessons.map((lesson: string, i: number) => (
                                <div key={i} className="lesson-item">
                                  <div className="lesson-time">
                                    <span className="time-number">{i + 1}</span>
                                    <span className="time-text">Ders</span>
                                  </div>
                                  <div className="lesson-content">
                                    <span className="lesson-name">{lesson}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="schedule-footer">
                      <div className="update-info">
                        <Clock size={14} />
                        <span>Son Güncelleme: {new Date().toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
      </main>
      </div>
    </ModernDashboardLayout>
  );
}
