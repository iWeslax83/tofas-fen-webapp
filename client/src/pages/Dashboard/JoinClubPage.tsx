import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuthContext } from "../../contexts/AuthContext";
// import { ClubService, UserService } from "../../utils/apiService"; // Not used
import tflLogo from '../../tfllogo.jpg';
import { toast } from 'sonner';
import '../../index.css';

interface User {
  id: string;
  adSoyad: string;
  email: string;
  avatar?: string;
}

export default function JoinClubPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        // Use user data from auth context instead of API call
        if (user) {
          setCurrentUser({
            id: user.id || '',
            adSoyad: user.adSoyad || 'Kullanıcı',
            email: user.email || '',
            avatar: undefined // avatar not available in User interface
          });
        }
      } catch (error) {
        console.error("Kullanıcı bilgileri alınamadı:", error);
        toast.error('Kullanıcı bilgileri yüklenirken hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();

    // Redirect after 3 seconds
    const timeout = setTimeout(() => {
      navigate("/student/kulupler");
    }, 3000);
    
    return () => clearTimeout(timeout);
  }, [navigate, user]);

  if (isLoading) {
    return (
      <div className="admin-panel">
        <header className="admin-header">
          <div className="container">
            <div className="header-content">
              <div className="logo-container">
                <img src={tflLogo} alt="TFL Logo" className="logo-image" />
                <div className="logo-text">
                  <h1 className="school-name">Tofaş Fen Lisesi</h1>
                  <p className="page-title">Kulüp Katılımı</p>
                </div>
              </div>
              <div className="header-actions">
              </div>
            </div>
          </div>
        </header>

        <main className="main-content">
          <div className="container">
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Kullanıcı bilgileri yükleniyor...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      {/* Header */}
      <header className="admin-header">
        <div className="container">
          <div className="header-content">
            <div className="logo-container">
              <img src={tflLogo} alt="TFL Logo" className="logo-image" />
              <div className="logo-text">
                <h1 className="school-name">Tofaş Fen Lisesi</h1>
                <p className="page-title">Kulüp Katılımı</p>
              </div>
            </div>
            <div className="header-actions">
              {currentUser && (
                <div className="user-menu">
                  <div className="user-avatar">
                    {currentUser.avatar ? (
                      <img 
                        src={currentUser.avatar} 
                        alt={currentUser.adSoyad} 
                        className="avatar-image"
                      />
                    ) : (
                      <div className="avatar-fallback">
                        {currentUser.adSoyad.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="container">
          {/* Back Button */}

          {/* Success Message */}
          <div className="content-grid">
            <div className="content-card success-card success-card-centered">
              <div className="card-content">
                <CheckCircle className="success-icon" />
                <h2 className="success-title">Katılım İsteğiniz Gönderildi!</h2>
                <p className="success-message">
                  Kulüp başkanı onayladığında üye olacaksınız.
                </p>
                
                {clubId && (
                  <div className="club-id-display">
                    <span className="club-id-label">Kulüp ID:</span>
                    <span className="club-id-value">{clubId}</span>
                  </div>
                )}

                <button
                  onClick={() => navigate("/student/kulupler")}
                  className="primary-button mt-6"
                >
                  <ArrowLeft className="button-icon" />
                  Kulüplerime Dön
                </button>
                
                <p className="redirect-notice">
                  Bu sayfe 3 saniye içinde otomatik olarak yönlendirilecektir.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

