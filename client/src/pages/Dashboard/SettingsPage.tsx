import { useEffect, useState } from "react";
import { Settings, User, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthContext } from "../../contexts/AuthContext";
import { UserService } from "../../utils/apiService";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import BackButton from '../../components/BackButton';
import { classChangeRequestSchema, roomChangeRequestSchema, validateForm } from "../../utils/validation";
import './SettingsPage.css';

type Tab = "Hesap" | "Okul" | "Pansiyon";
const TABS: Tab[] = ["Hesap", "Okul", "Pansiyon"];

export default function SettingsPage() {
  const { user: authUser, isLoading: authLoading } = useAuthContext();
  const [activeTab, setActiveTab] = useState<Tab>("Hesap");
  const [user, setUser] = useState<{ id: string; adSoyad: string; telefon?: string; rol: string; oda?: string } | null>(null);
  const [roomReq, setRoomReq] = useState({ oda: '', reason: '' });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const location = useLocation();

  // Hesap
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Okul
  const [classReq, setClassReq] = useState({ sinif: "", sube: "", reason: "" });

  useEffect(() => {
    // Check if user has the correct role
    if (!authLoading && authUser && !["admin", "teacher", "student", "parent"].includes(authUser.rol || '')) {
      console.warn(`User role ${authUser.rol} not allowed for settings page`);
      window.location.href = `/${authUser.rol || 'login'}`;
      return;
    }

    // Redirect to login if no user
    if (!authLoading && !authUser) {
      window.location.href = '/login';
      return;
    }

    // Use the user data from AuthContext instead of making an API call
    if (authUser) {
      setUser(authUser);
      setUserRole(authUser.rol || "");
      setLoading(false);
    }
  }, [authUser, authLoading]);




  // Şifre değiştir
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!currentPassword || !newPassword) {
      return toast.error("Lütfen tüm alanları doldurun", {
        duration: 4000,
        style: {
          background: '#dc2626',
          color: '#fff',
        },
      });
    }

    if (newPassword.length < 6) {
      return toast.error("Yeni şifre en az 6 karakter olmalıdır", {
        duration: 4000,
        style: {
          background: '#dc2626',
          color: '#fff',
        },
      });
    }

    if (currentPassword === newPassword) {
      return toast.error("Yeni şifre mevcut şifre ile aynı olamaz", {
        duration: 4000,
        style: {
          background: '#dc2626',
          color: '#fff',
        },
      });
    }
    
    setIsChangingPassword(true);
    const loadingToast = toast.loading("Şifre değiştiriliyor...", {
      duration: 0, // Don't auto-dismiss
    });
    
    try {
      const response = await UserService.changePassword({
        currentPassword,
        newPassword,
      });
      
      const { error } = response;
      
      if (error) {
        toast.dismiss(loadingToast);
        
        // Specific error messages based on server response
        if (error.includes("Mevcut şifre yanlış")) {
          toast.error("Mevcut şifre yanlış. Lütfen doğru şifreyi girin.", {
            duration: 5000,
            style: {
              background: '#dc2626',
              color: '#fff',
            },
          });
        } else if (error.includes("en az 6 karakter")) {
          toast.error("Yeni şifre en az 6 karakter olmalıdır.", {
            duration: 4000,
            style: {
              background: '#dc2626',
              color: '#fff',
            },
          });
        } else {
          toast.error(error, {
            duration: 5000,
            style: {
              background: '#dc2626',
              color: '#fff',
            },
          });
        }
      } else {
        toast.dismiss(loadingToast);
        toast.success("Şifre başarıyla değiştirildi! 🎉", {
          duration: 4000,
          style: {
            background: '#16a34a',
            color: '#fff',
          },
        });
        setCurrentPassword("");
        setNewPassword("");
      }
    } catch (err: any) {
      toast.dismiss(loadingToast);
      console.error("Password change exception:", err);
      
      // Network or server error
      if (err.message?.includes("Network Error") || err.code === "NETWORK_ERROR") {
        toast.error("Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.", {
          duration: 5000,
          style: {
            background: '#dc2626',
            color: '#fff',
          },
        });
      } else if (err.response?.status === 401) {
        toast.error("Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.", {
          duration: 5000,
          style: {
            background: '#dc2626',
            color: '#fff',
          },
        });
      } else {
        toast.error("Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.", {
          duration: 5000,
          style: {
            background: '#dc2626',
            color: '#fff',
          },
        });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };


  // Sınıf/şube değişikliği talebi
  const handleClassReq = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const { isValid, errors } = await validateForm(classChangeRequestSchema, classReq);
    if (!isValid) {
      const firstError = Object.values(errors)[0];
      toast.error(firstError, {
        duration: 4000,
        style: {
          background: '#dc2626',
          color: '#fff',
        },
      });
      return;
    }
    
    // try {
    //   const { error } = await RequestService.createClassChangeRequest({
    //     userId: user.id,
    //     currentClass: user.sinif || '',
    //     currentSection: user.sube || '',
    //     newClass: classReq.sinif,
    //     newSection: classReq.sube,
    //     reason: classReq.reason
    //   });
    //   if (error) {
    //     toast.error(error);
    //   } else {
    //     toast.success("Talep gönderildi");
    //     setClassReq({ sinif: "", sube: "", reason: "" });
    //   }
    // } catch (err: any) {
    //   toast.error("Hata oluştu");
    // }
    toast.success("Sınıf değişikliği talebi gönderildi! 📝", {
      duration: 4000,
      style: {
        background: '#16a34a',
        color: '#fff',
      },
    });
    setClassReq({ sinif: "", sube: "", reason: "" });
  };

  // Oda değişikliği talebi (pansiyon)
  const handleRoomReq = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const { isValid, errors } = await validateForm(roomChangeRequestSchema, roomReq);
    if (!isValid) {
      const firstError = Object.values(errors)[0];
      toast.error(firstError, {
        duration: 4000,
        style: {
          background: '#dc2626',
          color: '#fff',
        },
      });
      return;
    }
    
    // try {
    //   const { error } = await RequestService.createRoomChangeRequest({
    //     userId: user.id,
    //     currentRoom: user.oda || '',
    //     newRoom: roomReq.oda,
    //     reason: roomReq.reason
    //   });
    //   if (error) {
    //     toast.error(error);
    //   } else {
    //     toast.success("Talep gönderildi");
    //     setRoomReq({ oda: "", reason: "" });
    //   }
    // } catch (err: any) {
    //   toast.error("Hata oluştu");
    // }
    toast.success("Oda değişikliği talebi gönderildi! 🏠", {
      duration: 4000,
      style: {
        background: '#16a34a',
        color: '#fff',
      },
    });
    setRoomReq({ oda: "", reason: "" });
  };

  // Çıkış yap fonksiyonu (şimdilik kullanılmıyor)
  // const handleLogout = async () => {
  //   await SecureAPI.logout();
  //   window.location.href = "/login";
  // };

  if (loading) {
    return (
      <div className="centered-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <ModernDashboardLayout
        pageTitle="Ayarlar"
        breadcrumb={[
          { label: 'Ana Sayfa', path: `/${userRole}` },
          { label: 'Ayarlar' }
        ]}
      >
        <div className="error-message">
          <p>Kullanıcı bulunamadı.</p>
        </div>
      </ModernDashboardLayout>
    );
  }

  const isPansiyon = !!user?.oda;

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${userRole}` },
    { label: 'Ayarlar' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Ayarlar"
      breadcrumb={breadcrumb}
    >        <BackButton />

      <div className="dashboard-content">
          <div className="tabs-container">
            <ul className="tabs-header">
              {TABS.map((tabName: Tab) => (
                (tabName !== "Pansiyon" || isPansiyon) && (
                  <li key={tabName} className="tab-item">
                    <button
                      onClick={() => setActiveTab(tabName)}
                      className={`tab-button ${activeTab === tabName ? 'active' : ''}`}
                    >
                      {tabName}
                    </button>
                  </li>
                )
              ))}
            </ul>

          {/* Hesap Tab */}
          {activeTab === "Hesap" && (
            <div className="tab-content">
              <div className="form-section">
                <h3 className="form-title">
                  <User className="h-5 w-5" />
                  Şifre Değiştir
                </h3>
                <form onSubmit={handlePasswordChange} className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Mevcut Şifre</label>
                    <input
                      type="password"
                      className="form-input"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      placeholder="Mevcut şifrenizi girin"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Yeni Şifre</label>
                    <input
                      type="password"
                      className="form-input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Yeni şifrenizi girin"
                    />
                    <span style={{ color: '#718096', fontSize: 13, marginTop: 4 }}>Şifreniz en az 6 karakter olmalıdır.</span>
                  </div>
                  <div className="form-actions">
                    <button 
                      type="submit" 
                      className="submit-button"
                      disabled={isChangingPassword}
                      style={{
                        opacity: isChangingPassword ? 0.7 : 1,
                        cursor: isChangingPassword ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isChangingPassword ? (
                        <>
                          <div className="spinner-small"></div>
                          Şifre Değiştiriliyor...
                        </>
                      ) : (
                        'Şifreyi Değiştir'
                      )}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}
          {/* Okul Tab */}
          {activeTab === "Okul" && (
            <div className="tab-content">
              <div className="form-section">
                <h3 className="form-title">
                  <User className="h-5 w-5" />
                  Sınıf/Şube Değişikliği Talebi
                </h3>
                <form onSubmit={handleClassReq} className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Sınıf</label>
                    <input
                      className="form-input"
                      value={classReq.sinif}
                      onChange={(e) => setClassReq((v) => ({ ...v, sinif: e.target.value }))}
                      required
                      placeholder="Sınıf seçin"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Şube</label>
                    <input
                      className="form-input"
                      value={classReq.sube}
                      onChange={(e) => setClassReq((v) => ({ ...v, sube: e.target.value }))}
                      required
                      placeholder="Şube seçin"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Açıklama</label>
                    <textarea
                      className="form-textarea"
                      value={classReq.reason}
                      onChange={(e) => setClassReq((v) => ({ ...v, reason: e.target.value }))}
                      placeholder="Değişiklik nedenini açıklayın"
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="submit-button">
                      Talebi Gönder
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Pansiyon Tab */}
          {activeTab === "Pansiyon" && isPansiyon && (
            <div className="tab-content">
              <div className="form-section">
                <h3 className="form-title">
                  <User className="h-5 w-5" />
                  Oda Değişikliği Talebi
                </h3>
                <form onSubmit={handleRoomReq} className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Yeni Oda</label>
                    <input
                      className="form-input"
                      value={roomReq.oda}
                      onChange={(e) => setRoomReq((v) => ({ ...v, oda: e.target.value }))}
                      required
                      placeholder="Yeni oda numarası"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Açıklama</label>
                    <textarea
                      className="form-textarea"
                      value={roomReq.reason}
                      onChange={(e) => setRoomReq((v) => ({ ...v, reason: e.target.value }))}
                      placeholder="Oda değişikliği nedenini açıklayın"
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="submit-button">
                      Talebi Gönder
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          </div>
        </div>
    </ModernDashboardLayout>
  );
} 
