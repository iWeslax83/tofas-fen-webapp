import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Users, Mail, X, Check, AlertCircle } from 'lucide-react'; // ArrowLeft removed
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import { ClubService } from '../../utils/apiService';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import BackButton from '../../components/BackButton';
import './MyClubsPage.css';

// Types
interface Club {
  id: string;
  name: string;
  description: string;
  logo?: string;
  members: string[];
  roles: Record<string, string>;
}

interface InviteRequest {
  id?: string;
  clubId: string;
  clubName?: string;
  userId: string;
  role: "Üye" | "Başkan" | string;
  createdAt?: string;
  timestamp?: number;
  _doc?: InviteRequest;
}

// ClubCard component
const ClubCard = ({ club, onLeave }: { club: Club; onLeave: (id: string) => void }) => (
  <div className="club-card">
    <div className="club-logo">
      {club.logo ? (
        <img src={club.logo} alt={`${club.name} logo`} className="club-logo__image" />
      ) : (
        <Users className="club-logo__default" />
      )}
    </div>
    <div className="club-info">
      <h3 className="club-info__title">{club.name}</h3>
      <p className="club-info__description">{club.description || 'Açıklama yok'}</p>
      <div className="club-actions">
        <Link to={`/kulup/${club.id}`} className="button button--primary">
          Detaylar
        </Link>
        <button 
          onClick={() => onLeave(club.id)} 
          className="button button--danger"
        >
          Ayrıl
        </button>
      </div>
    </div>
  </div>
);

const InviteCard = ({ 
  invite, 
  onAccept, 
  onReject 
}: { 
  invite: InviteRequest; 
  onAccept: () => void; 
  onReject: () => void; 
}) => (
  <div className="invite-card">
    <div className="invite-content">
      <h3 className="invite-content__title">{invite.clubName || 'Bilinmeyen Kulüp'}</h3>
      <p className="invite-content__role">Rol: {invite.role}</p>
      <p className="invite-content__date">
        {new Date(invite.createdAt || invite.timestamp || Date.now()).toLocaleDateString()}
      </p>
    </div>
    <div className="invite-actions">
      <button onClick={onAccept} className="button button--success">
        <Check className="button__icon" />
        Kabul Et
      </button>
      <button onClick={onReject} className="button button--danger">
        <X className="button__icon" />
        Reddet
      </button>
    </div>
  </div>
);

// const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'; // Not used

export default function MyClubsPage() {
  const { user } = useAuth(["admin", "teacher", "student", "parent"]);
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [invites, setInvites] = useState<InviteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<'myClubs' | 'invites'>('myClubs');
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      if (!user?.id) {
        throw new Error("Kullanıcı bilgileri yüklenemedi");
      }
      
      const [clubsRes, invitesRes] = await Promise.all([
        ClubService.getUserClubs(user?.id || ''),
        ClubService.getUserInvites(user?.id || '')
      ]);

      // Handle responses
      if (clubsRes.error) {
        setError(clubsRes.error);
      } else {
        setMyClubs((clubsRes.data as Club[]) || []);
      }

      if (invitesRes.error) {
        setError(invitesRes.error);
      } else {
        setInvites((invitesRes.data as InviteRequest[]) || []);
      }
    } catch (err: unknown) {
      setError((err as any)?.response?.data?.message || "Kulüp bilgileri yüklenirken bir hata oluştu");
      toast.error("Kulüp bilgileri yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [user?.id, loadData]); // Reload when user changes

  const handleAccept = async (invite: InviteRequest) => {
    try {
      // Optimistic update
      setInvites(prev => prev.filter(i => i !== invite));
      
      const { error } = await ClubService.acceptClubRequest(invite.clubId, user?.id || '');
      if (error) {
        toast.error(error);
      } else {
        await loadData();
        toast.success("Kulübe başarıyla katıldınız");
      }
    } catch (err: unknown) {
      // Error handled by toast notification
      toast.error((err as any)?.response?.data?.message || "Kulübe katılırken bir hata oluştu");
      await loadData(); // Revert optimistic update on error
    }
  };

  const handleReject = async (req: InviteRequest) => {
    try {
      // Mongoose document'ı düzgün parse et
      const invitation = req._doc || req;
      
      setInvites(invites => invites.filter(i => {
        const invite = i._doc || i;
        return invite.clubId !== invitation.clubId || invite.userId !== invitation.userId;
      }));
      
      const { error } = await ClubService.rejectClubRequest(invitation.clubId, invitation.userId);
      if (error) {
        console.error('Error rejecting request:', error);
      } else {
        await loadData();
      }
    } catch (err: unknown) {
      console.error("Reddedilemedi:", err);
      console.error("Error details:", (err as any)?.response?.data);
    }
  };

  const handleLeave = async (clubId: string) => {
    try {
      // Get current user data
      const userId = user?.id;

      if (!userId) {
        navigate("/login");
        return;
      }

      const { error } = await ClubService.removeClubMember(clubId, userId);
      if (error) {
        console.error('Error leaving club:', error);
      } else {
        loadData();
      }
    } catch (err) {
      console.error("Ayrılamadı:", err);
    }
  };

  if (loading) {
    return (
      <div className="my-clubs-page">
        <div className="loading-container">
          <Loader2 className="loading-spinner" />
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-clubs-page">
        <div className="error-message">
          <AlertCircle className="error-icon" />
          <p>Kulüp bilgileri yüklenirken bir hata oluştu: {error}</p>
          <button onClick={loadData} className="button button--primary">
            Yeniden Dene
          </button>
        </div>
      </div>
    );
  }

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Kulüplerim' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Kulüplerim"
      breadcrumb={breadcrumb}
    >
      <div className="my-clubs-page">
        <BackButton />
        <div className="my-clubs-tabs">
        <button
          className={`my-clubs-tabs__button ${activeTab === 'myClubs' ? 'active' : ''}`}
          onClick={() => setActiveTab('myClubs')}
          aria-selected={activeTab === 'myClubs'}
        >
          Üye Olduğum Kulüpler
        </button>
        <button
          className={`my-clubs-tabs__button ${activeTab === 'invites' ? 'active' : ''}`}
          onClick={() => setActiveTab('invites')}
          aria-selected={activeTab === 'invites'}
        >
          Davetlerim
          {invites.length > 0 && (
            <span className="my-clubs-tabs__badge">{invites.length}</span>
          )}
        </button>
      </div>

      <div className="my-clubs-content">
        {activeTab === 'myClubs' ? (
          <div className="my-clubs-grid">
            {myClubs.length === 0 ? (
              <div className="my-clubs-empty-state">
                <Users className="my-clubs-empty-state__icon" />
                <p>Henüz hiç kulübe üye değilsiniz.</p>
              </div>
            ) : (
              myClubs.map(club => (
                <ClubCard 
                  key={club.id || club.id || Math.random()}
                  club={club}
                  onLeave={handleLeave}
                />
              ))
            )}
          </div>
        ) : (
          <div className="my-invites-grid">
            {invites.length === 0 ? (
              <div className="my-clubs-empty-state">
                <Mail className="my-clubs-empty-state__icon" />
                <p>Hiç davetiniz bulunmuyor.</p>
              </div>
            ) : (
              invites.map((invite) => (
                <InviteCard
                  key={`${invite.clubId || 'unknown'}-${invite.userId || 'unknown'}`}
                  invite={invite}
                  onAccept={() => handleAccept(invite)}
                  onReject={() => handleReject(invite)}
                />
              ))
            )}
          </div>
        )}
      </div>
      </div>
    </ModernDashboardLayout>
  );
}
