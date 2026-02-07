import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { UserService } from "../../utils/apiService";
import { User } from "../../types/user";
import ModernDashboardLayout from '../../components/ModernDashboardLayout';

import './DersProgramiPage.css';
import {
  BookOpen,
  Clock
} from 'lucide-react';
import scheduleData from './DersProgramlari.json';
import { toast } from 'sonner';
import { LoadingState, Skeleton } from '../../components/SkeletonComponents';

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

// Local interface removed in favor of global User type

interface Schedule {
  [key: string]: ClassSchedule;
}

// Type guard for the imported JSON data
const isSchedule = (data: unknown): data is Schedule => {
  return data !== null && typeof data === 'object';
};

const schedules = isSchedule(scheduleData) ? scheduleData : {};

export default function DersProgramiPage() {
  const { user: authUser } = useAuth(["admin", "teacher", "student", "parent"]);
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<{ sinif: string; sube: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({}); // Not used

  // Safely access the schedule data with type checking
  const getClassSchedule = (sinif: string, sube: string): DaySchedule | null => {
    const classData = (schedules as Record<string, ClassSchedule>)[sinif];
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
      const { data: userData, error: userError } = await UserService.getCurrentUser();
      console.log('📡 User Data:', userData);

      if (userError || !userData || !["admin", "teacher", "student", "parent"].includes(userData.rol)) {
        setError(userError || "Bu sayfaya erişim yetkiniz bulunmuyor.");
        setLoading(false);
        return;
      }

      setUser(userData);
      let allClasses: { sinif: string; sube: string; label: string }[] = [];

      // For students, show their own class
      if (userData.rol === "student" && userData.sinif && userData.sube) {
        allClasses.push({
          sinif: userData.sinif,
          sube: userData.sube,
          label: `${String(userData.sinif)}/${String(userData.sube)} - ${userData.adSoyad}`
        });
      }

      // For parents, show their children's classes
      if (userData.rol === "parent" && userData.childrenSiniflar) {
        userData.childrenSiniflar.forEach((child) => {
          allClasses.push({
            sinif: child.sinif,
            sube: child.sube,
            label: `${String(child.sinif)}/${String(child.sube)} - ${child.adSoyad || 'Çocuk'}`
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
    } catch (err: unknown) {
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


  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Ders Programı' }
  ];

  // Skeleton for schedule loading
  const ScheduleSkeleton = () => (
    <div className="ders-programi-page">
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-title-section">
            <BookOpen className="page-icon" />
            <Skeleton style={{ width: '200px', height: '32px' }} />
          </div>
        </div>
      </div>

      <div className="ders-programi-container">
        <div className="timetable-grid">
          <div className="class-schedule-card">
            <div className="class-header">
              <div className="class-info">
                <Skeleton style={{ width: '60px', height: '60px', borderRadius: '12px' }} />
                <div className="class-details">
                  <Skeleton style={{ width: '200px', height: '28px', marginBottom: '8px' }} />
                  <Skeleton style={{ width: '150px', height: '20px' }} />
                </div>
              </div>
            </div>

            <div className="schedule-grid">
              {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'].map((day) => (
                <div key={day} className="day-column">
                  <div className="day-header">
                    <Skeleton style={{ width: '100px', height: '24px', margin: '0 auto 8px' }} />
                    <Skeleton style={{ width: '60px', height: '16px', margin: '0 auto' }} />
                  </div>
                  <div className="lessons-list">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="lesson-item">
                        <Skeleton style={{ width: '50px', height: '50px', borderRadius: '8px' }} />
                        <Skeleton style={{ flex: 1, height: '20px', borderRadius: '4px' }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ModernDashboardLayout
      pageTitle="Ders Programı"
      breadcrumb={breadcrumb}
    >
      <LoadingState
        isLoading={loading}
        error={error}
        onRetry={fetchUserData}
        skeleton={<ScheduleSkeleton />}
      >
        <div className="ders-programi-page">
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
      </LoadingState>
    </ModernDashboardLayout>
  );
}
