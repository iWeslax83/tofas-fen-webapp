import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { ClubService } from "../../utils/apiService";
import { 
  SkeletonCard, 
  SkeletonList, 
  SkeletonTitle, 
  SkeletonSubtitle,
  LoadingState 
} from '../../components/SkeletonComponents';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import BackButton from '../../components/BackButton';

// Icons
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  MessageCircle,
  Image as ImageIcon,
  Settings as SettingsIcon,
  Info,
  Globe,
  Instagram,
  Twitter,
  Megaphone,
  Share2,
  SortAsc,
  SortDesc,
  Search
} from 'lucide-react';

// Types
type Role = 'admin' | 'moderator' | 'member';

interface Member {
  userId: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  joinDate: string;
}

interface SocialLinks {
  website?: string;
  instagram?: string;
  twitter?: string;
  discord?: string;
}

interface ClubEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  createdAt: string;
  createdBy: {
    userId: string;
    name: string;
  };
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  createdBy: {
    userId: string;
    name: string;
  };
}

interface ClubResponse {
  id: string;
  name: string;
  description: string;
  bannerImage?: string;
  logo?: string;
  createdAt: string;
  updatedAt: string;
  members: Member[];
  socialLinks?: SocialLinks;
  events: ClubEvent[];
  announcements: Announcement[];
  memberCount: number;
  isMember: boolean;
  isAdmin: boolean;
  messages?: {
    sender: string;
    content: string;
    timestamp: string;
  }[];
}

type ClubMessage = NonNullable<ClubResponse['messages']>[number];

// API functions
const fetchClub = async (clubId: string): Promise<ClubResponse> => {
  const { data, error } = await ClubService.getClubById(clubId);
  if (error) {
    throw new Error(error);
  }
  return data as ClubResponse;
};

const updateClub = async (clubId: string, data: { description: string; socialLinks: SocialLinks }) => {
  const { data: responseData, error } = await ClubService.updateClub(clubId, data);
  if (error) {
    throw new Error(error);
  }
  return responseData;
};

const joinClub = async (clubId: string) => {
  const { data, error } = await ClubService.joinClub(clubId);
  if (error) {
    throw new Error(error);
  }
  return data;
};

const leaveClub = async (clubId: string) => {
  const { data, error } = await ClubService.leaveClub(clubId);
  if (error) {
    throw new Error(error);
  }
  return data;
};

// Helper components
const ClubDetailSkeleton = () => (
  <div className="club-detail-container">
    <div className="club-detail-header">
      <SkeletonTitle />
      <SkeletonSubtitle />
    </div>
    <div className="club-detail-content">
      <SkeletonCard />
      <SkeletonList items={3} />
    </div>
  </div>
);

// ErrorMessage component removed as it's not used

const ClubDetailPage = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  // Temporarily use a mock user since AuthContext is not available
  const user = { id: 'temp-user', adSoyad: 'Test User' };
  const queryClient = useQueryClient();
  
  // State for UI
  const [activeTab, setActiveTab] = useState('info');
  const [editedDescription, setEditedDescription] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    website: '',
    instagram: '',
    twitter: '',
    discord: ''
  });
  const [newMsg, setNewMsg] = useState('');
  const [evTitle, setEvTitle] = useState('');
  const [evDate, setEvDate] = useState('');
  const [evLocation, setEvLocation] = useState('');
  const [evDesc, setEvDesc] = useState('');
  const [anTitle, setAnTitle] = useState('');
  const [anContent, setAnContent] = useState('');
  const [inviteId, setInviteId] = useState('');
  const [inviteSent, setInviteSent] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [eventQuery, setEventQuery] = useState('');
  const [eventSortAsc, setEventSortAsc] = useState(false);
  const [announcementQuery, setAnnouncementQuery] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [localMessages, setLocalMessages] = useState<ClubMessage[]>([]);

  // Fetch club data
  const { 
    data: club, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<ClubResponse>({
    queryKey: ['club', clubId],
    queryFn: () => clubId ? fetchClub(clubId) : Promise.reject('No club ID provided'),
    enabled: !!clubId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Set initial form values when club data is loaded
  useEffect(() => {
    if (club) {
      setEditedDescription(club.description || '');
      setSocialLinks({
        website: club.socialLinks?.website || '',
        instagram: club.socialLinks?.instagram || '',
        twitter: club.socialLinks?.twitter || '',
        discord: club.socialLinks?.discord || ''
      });
      try {
        const stored = localStorage.getItem(`club:${club.id}:messages`);
        if (stored) {
          const parsed: ClubMessage[] = JSON.parse(stored);
          setLocalMessages(parsed);
        } else {
          setLocalMessages([]);
        }
      } catch {
        setLocalMessages([]);
      }
    }
  }, [club]);

  // Get current user's role in the club
  const userRole = club?.members.find(member => member.userId === user?.id)?.role;
  const isAdmin = userRole === 'admin';
  const isMember = !!userRole;

  // Mutations
  const updateClubMutation = useMutation({
    mutationFn: (data: { description: string; socialLinks: SocialLinks }) => 
      clubId ? updateClub(clubId, data) : Promise.reject('No club ID'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club', clubId] });
      toast.success('Kulüp bilgileri güncellendi');
    },
    onError: (error: Error) => {
      toast.error(`Güncelleme hatası: ${error.message}`);
    }
  });

  const joinClubMutation = useMutation({
    mutationFn: () => clubId ? joinClub(clubId) : Promise.reject('No club ID'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club', clubId] });
      queryClient.invalidateQueries({ queryKey: ['myClubs'] });
      toast.success('Kulübe katıldınız!');
    },
    onError: (error: Error) => {
      toast.error(`Katılma hatası: ${error.message}`);
    }
  });

  const leaveClubMutation = useMutation({
    mutationFn: () => clubId ? leaveClub(clubId) : Promise.reject('No club ID'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club', clubId] });
      queryClient.invalidateQueries({ queryKey: ['myClubs'] });
      toast.success('Kulüpten ayrıldınız');
    },
    onError: (error: Error) => {
      toast.error(`Ayrılma hatası: ${error.message}`);
    }
  });

  // Handlers
  const handleSave = () => {
    updateClubMutation.mutate({
      description: editedDescription,
      socialLinks
    });
  };

  const handleCancel = () => {
    if (club) {
      setEditedDescription(club.description || '');
      setSocialLinks({
        website: club.socialLinks?.website || '',
        instagram: club.socialLinks?.instagram || '',
        twitter: club.socialLinks?.twitter || '',
        discord: club.socialLinks?.discord || ''
      });
    }
  };

  const handleJoin = () => {
    joinClubMutation.mutate();
  };

  const handleLeave = () => {
    if (window.confirm('Bu kulüpten ayrılmak istediğinize emin misiniz?')) {
      leaveClubMutation.mutate();
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: tr });
  };

  const handleBack = () => {
    // Navigate to user's role-based main page
    const role = (user as any)?.rol;
    switch (role) {
      case 'admin': navigate('/admin'); break;
      case 'student': navigate('/student'); break;
      case 'teacher': navigate('/teacher'); break;
      case 'parent': navigate('/parent'); break;
      case 'hizmetli': navigate('/hizmetli'); break;
      default: navigate('/'); break;
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: club?.name || 'Kulüp Detayı',
      text: `${club?.name} kulübünü görüntüleyin`,
      url: window.location.href
    };
    try {
      if (typeof (navigator as { share?: (data: ShareData) => Promise<void> }).share === 'function') {
        await (navigator as { share: (data: ShareData) => Promise<void> }).share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Bağlantı panoya kopyalandı');
      }
    } catch {
      toast.error('Paylaşım başarısız oldu');
    }
  };

  const saveLocalMessages = (clubId: string, messages: ClubMessage[]) => {
    try {
      localStorage.setItem(`club:${clubId}:messages`, JSON.stringify(messages ?? []));
    } catch {
      // ignore
    }
  };

  const getAllMessages = (): ClubMessage[] => {
    const apiMessages: ClubMessage[] = (club?.messages ?? []) as ClubMessage[];
    const merged = [...apiMessages, ...(localMessages || [])];
    return merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !club) return;
    const message = {
      sender: user?.adSoyad || 'Kullanıcı',
      content: newMsg.trim(),
      timestamp: new Date().toISOString()
    };
    const updated = [...(localMessages || []), message];
    setLocalMessages(updated);
    saveLocalMessages(club.id, updated);
    setNewMsg('');
    toast.success('Mesaj gönderildi!');
  };

  const downloadEventAsICS = (event: ClubEvent) => {
    const start = new Date(event.date);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const toUTC = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Tofas Fen//Club Events//TR',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${event.id}@tofas-fen`,
      `DTSTAMP:${toUTC(new Date())}`,
      `DTSTART:${toUTC(start)}`,
      `DTEND:${toUTC(end)}`,
      `SUMMARY:${event.title.replace(/\n/g, ' ')}`,
      `DESCRIPTION:${(event.description || '').replace(/\n/g, ' ')}`,
      `LOCATION:${(event.location || '').replace(/\n/g, ' ')}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const breadcrumb = [
    { label: 'Ana Sayfa', path: '/student' },
    { label: 'Kulüplerim', path: '/student/kuluplerim' },
    { label: club?.name || 'Kulüp Detayı' }
  ];

  // Loading state
  return (
    <ModernDashboardLayout
      pageTitle={club?.name || 'Kulüp Detayı'}
      breadcrumb={breadcrumb}
    >
      <LoadingState
        isLoading={isLoading}
        error={error?.message}
        onRetry={() => refetch()}
        skeleton={<ClubDetailSkeleton />}
      >
        {!club ? (
          <div className="container">
            <div className="club-detail-not-found">
              <div>
                <h1 className="club-detail-not-found-title">Kulüp Bulunamadı</h1>
              </div>
              <button 
                onClick={handleBack}
                className="btn-blue"
              >
                Geri Dön
              </button>
            </div>
            <p>Belirtilen kulüp bulunamadı veya görüntüleme yetkiniz yok.</p>
          </div>
        ) : (
          <div className="club-detail-page">
      {/* Decorative background elements */}
      <div className="club-detail-blob club-detail-blob-1"></div>
      <div className="club-detail-blob club-detail-blob-2"></div>
      
      {/* Header with logo, school name, and user menu */}
      <header className="dashboard-header">
        <div className="header-left">
          <img src="/logo.png" alt="TFL Logo" className="header-logo" />
          <div className="school-info">
            <h1 className="school-name">Tofaş Fen Lisesi</h1>
            <p className="page-title">Kulüp Detayı</p>
          </div>
        </div>
        <div className="user-menu">
          <div className="user-avatar">
            {user?.adSoyad?.charAt(0) || 'U'}
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="content-header">
          <BackButton />
          <div className="header-actions">
            <h2>{club?.name || 'Kulüp Detayı'}</h2>
            <button
              onClick={handleShare}
              type="button"
              className="btn-white"
              title="Bağlantıyı paylaş"
            >
              <Share2 size={16} />
              Paylaş
            </button>
          </div>
        </div>

        <div className="club-detail-container">
          {/* Tab navigation */}
          <nav className="tab-nav" aria-label="Kulüp sekmeleri">
            <button
              onClick={() => setActiveTab("info")}
              className={`tab-item ${activeTab === "info" ? 'active' : ''}`}
              type="button"
            >
              <Info size={16} className="icon" />
              <span>Bilgi</span>
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`tab-item ${activeTab === "chat" ? 'active' : ''}`}
              type="button"
            >
              <MessageCircle size={16} className="icon" />
              <span>Sohbet</span>
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`tab-item ${activeTab === "members" ? 'active' : ''}`}
              type="button"
            >
              <Users size={16} className="icon" />
              <span>Üyeler</span>
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`tab-item ${activeTab === "events" ? 'active' : ''}`}
              type="button"
            >
              <Calendar size={16} className="icon" />
              <span>Etkinlikler</span>
            </button>
            <button
              onClick={() => setActiveTab("announcements")}
              className={`tab-item ${activeTab === "announcements" ? 'active' : ''}`}
              type="button"
            >
              <Megaphone size={16} className="icon" />
              <span>Duyurular</span>
            </button>
            {(club?.socialLinks?.website || club?.socialLinks?.instagram) && (
              <button
                onClick={() => setActiveTab("gallery")}
                className={`tab-item ${activeTab === "gallery" ? 'active' : ''}`}
                type="button"
              >
                <ImageIcon size={16} className="icon" />
                <span>Galeri</span>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`tab-item ${activeTab === "admin" ? 'active' : ''}`}
                type="button"
              >
                <SettingsIcon size={16} className="icon" />
                <span>Yönetim</span>
              </button>
            )}
          </nav>

          {activeTab === "info" && (
            <div className="tab-content">
              <div className="club-header">
                <div className="club-logo-container">
                  {club?.logo ? (
                    <img
                      src={club.logo}
                      alt={`${club.name} logo`}
                      className="club-logo"
                    />
                  ) : (
                    <div className="club-logo-placeholder">
                      <Users size={32} />
                    </div>
                  )}
                </div>
                <div className="club-info">
                  <h1 className="club-name">{club?.name}</h1>
                  <p className="club-description">{club?.description || 'Açıklama bulunmamaktadır.'}</p>
                  
                  <div className="club-meta">
                    <div className="meta-item">
                      <span className="meta-label">Kuruluş Tarihi:</span>
                      <span className="meta-value">
                        {new Date(club?.createdAt).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Üye Sayısı:</span>
                      <span className="meta-value">{club?.members?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Links */}
                            <div className="club-detail-mb-8">
                <h3 className="club-detail-social-media-title">Sosyal Medya</h3>
        <div className="club-detail-social-media-grid">
                  {club.socialLinks?.website && (
                    <a
                      href={club.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="club-detail-social-media-link club-detail-social-media-link-blue"
                    >
                      <span className="club-detail-sr-only">Website</span>
                      <Globe className="icon-large" />
                    </a>
                  )}
                  {club.socialLinks?.instagram && (
                    <a
                      href={`https://instagram.com/${club.socialLinks.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="club-detail-social-media-link club-detail-social-media-link-pink"
                    >
                      <span className="club-detail-sr-only">Instagram</span>
                      <Instagram className="icon-large" />
                    </a>
                  )}
                  {club.socialLinks?.twitter && (
                    <a
                      href={`https://twitter.com/${club.socialLinks.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="club-detail-social-media-link club-detail-social-media-link-light-blue"
                    >
                      <span className="club-detail-sr-only">Twitter</span>
                      <Twitter className="icon-large" />
                    </a>
                  )}
                  {club.socialLinks?.discord && (
                    <a
                      href={club.socialLinks.discord}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="club-detail-social-media-link club-detail-social-media-link-indigo"
                    >
                      <span className="club-detail-sr-only">Discord</span>
                      <MessageSquare className="icon-large" />
                    </a>
                  )}
                </div>
              </div>

              {/* Join/Leave buttons */}
              {!isMember ? (
                <button
                  onClick={handleJoin}
                  disabled={joinClubMutation.isPending}
                  className="btn-green-600"
                >
                  {joinClubMutation.isPending ? 'Katılıyor...' : 'Kulübe Katıl'}
                </button>
              ) : (
                <button
                  onClick={handleLeave}
                  disabled={leaveClubMutation.isPending}
                  className="btn-red-600"
                >
                  {leaveClubMutation.isPending ? 'Ayrılıyor...' : 'Kulüpten Ayrıl'}
                </button>
              )}
                        </div>
          )}

          {activeTab === "chat" && (
            <div className="tab-content">
              <div className="chat-container">
                <h3 className="club-detail-chat-title">Kulüp Sohbeti</h3>
                
                {/* Messages Display */}
                <div className="messages-container">
                  {getAllMessages().length > 0 ? (
                    getAllMessages().map((msg, index) => (
                      <div key={index} className="club-detail-chat-message">
                        <div className="club-detail-chat-avatar">
                          {msg.sender?.charAt(0) || 'U'}
                        </div>
                        <div className="club-detail-chat-content">
                          <div className="club-detail-chat-header">
                            <span className="club-detail-chat-sender">{msg.sender || 'Bilinmeyen'}</span>
                            <span className="club-detail-chat-time">
                              {formatDate(msg.timestamp || new Date().toISOString())}
                            </span>
                          </div>
                          <p className="club-detail-chat-text">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="club-detail-chat-empty">
                      <MessageSquare className="club-detail-chat-empty-icon" />
                      <p>Henüz mesaj yok. İlk mesajı siz gönderin!</p>
                    </div>
                  )}
              </div>

                {/* Message Input */}
                {isMember && (
                  <form className="message-input-form" onSubmit={handleSendMessage}>
                    <input
                      type="text"
                      value={newMsg}
                      onChange={(e) => setNewMsg(e.target.value)}
                      placeholder="Mesajınızı yazın..."
                      className="club-detail-chat-input-field"
                    />
                    <button
                      type="submit"
                      className="club-detail-chat-input-button"
                    >
                      Gönder
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {activeTab === "members" && (
            <div className="tab-content">
              <div className="club-detail-members-header">
                <div className="club-detail-members-search">
                  <Search size={16} className="club-detail-members-search-icon" />
                  <input
                    type="text"
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                    placeholder="Üye ara..."
                    className="club-detail-members-search-input"
                  />
                </div>
              </div>
              <div className="club-detail-members-grid">
                {club.members
                  .filter(m => {
                    const q = memberQuery.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      m.name.toLowerCase().includes(q) ||
                      (m.email || '').toLowerCase().includes(q)
                    );
                  })
                  .map((member) => (
                    <div key={member.userId} className="club-detail-member-card">
                      <div className="club-detail-member-info">
                        <div className="club-detail-member-avatar">
                          {member.name?.charAt(0) || 'U'}
                        </div>
                        <div className="club-detail-member-details">
                          <h4>{member.name}</h4>
                          <p className="club-detail-member-email">{member.email}</p>
                        </div>
                      </div>
                      <span className={`club-detail-member-role ${member.role === 'admin' ? 'club-detail-member-role-admin' : member.role === 'moderator' ? 'club-detail-member-role-moderator' : 'club-detail-member-role-member'}`}>
                        {member.role === 'admin' ? 'Admin' : member.role === 'moderator' ? 'Mod' : 'Üye'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === "events" && (
            <div className="tab-content">
              <div className="events-container">
                <div className="club-detail-events-header">
                  <h3 className="club-detail-events-title">Kulüp Etkinlikleri</h3>
                  <div className="club-detail-events-search">
                    <div className="relative">
                      <Search size={16} className="club-detail-members-search-icon" />
                      <input
                        type="text"
                        value={eventQuery}
                        onChange={(e) => setEventQuery(e.target.value)}
                        placeholder="Etkinlik ara..."
                        className="club-detail-events-search-input"
                      />
                    </div>
                    <button
                      onClick={() => setEventSortAsc(prev => !prev)}
                      className="btn-white"
                      title={eventSortAsc ? 'En yeniye göre sırala' : 'En eskiye göre sırala'}
                    >
                      {eventSortAsc ? <SortAsc size={16} /> : <SortDesc size={16} />}
                      Sırala
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setShowEventForm(!showEventForm)}
                        className="btn-green"
                      >
                        {showEventForm ? 'Formu Gizle' : '+ Yeni Etkinlik'}
                      </button>
                    )}
                  </div>
                </div>

                                {/* Event Creation Form */}
                {showEventForm && isAdmin && (
                  <div className="event-form">
                                          <h4 className="club-detail-section-title">Yeni Etkinlik Ekle</h4>
                    <form className="club-detail-form-spacing" onSubmit={async (e) => {
                      e.preventDefault();
                      if (evTitle.trim() && evDate && evDesc.trim()) {
                        try {
                          const eventData = {
                            title: evTitle,
                            date: evDate,
                            description: evDesc,
                            location: evLocation || '',
                            type: 'activity'
                          };
                          
                          const { error } = await ClubService.createEvent(clubId, eventData);
                          if (error) {
                            toast.error('Etkinlik eklenirken hata oluştu');
                          } else {
                            toast.success('Etkinlik başarıyla eklendi!');
                            setEvTitle('');
                            setEvDate('');
                            setEvDesc('');
                            setEvLocation('');
                            setShowEventForm(false);
                            // Refresh club data
                            fetchClub(clubId);
                          }
                        } catch {
                          toast.error('Etkinlik eklenirken hata oluştu');
                        }
                      } else {
                        toast.error('Lütfen tüm alanları doldurun');
                      }
                    }}>
                      <div>
                        <label className="club-detail-form-label">
                          Etkinlik Adı
                        </label>
                  <input
                    type="text"
                          value={evTitle}
                          onChange={(e) => setEvTitle(e.target.value)}
                          className="club-detail-input-field"
                          placeholder="Etkinlik adı..."
                        />
                      </div>
                      <div className="club-detail-form-grid-2">
                        <div>
                          <label className="club-detail-form-label">
                            Tarih
                          </label>
                          <input
                            type="date"
                            value={evDate}
                            onChange={(e) => setEvDate(e.target.value)}
                            className="club-detail-input-field"
                          />
                        </div>
                        <div>
                          <label className="club-detail-form-label">
                            Konum (Opsiyonel)
                          </label>
                          <input
                            type="text"
                            value={evLocation}
                            onChange={(e) => setEvLocation(e.target.value)}
                            className="club-detail-input-field"
                            placeholder="Konum..."
                          />
                        </div>
                      </div>
                      <div>
                        <label className="club-detail-form-label">
                          Açıklama
                        </label>
                        <textarea
                          value={evDesc}
                          onChange={(e) => setEvDesc(e.target.value)}
                          className="club-detail-input-field"
                          rows={3}
                          placeholder="Etkinlik açıklaması..."
                        />
                      </div>
                      <div className="club-detail-flex-gap-2">
                        <button
                          type="submit"
                          className="btn-green-600"
                        >
                          Etkinlik Ekle
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowEventForm(false)}
                          className="btn-gray-500"
                        >
                          İptal
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {club.events && club.events.length > 0 ? (
                  <div className="events-grid">
                    {club.events
                      .filter(ev => {
                        const q = eventQuery.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          ev.title.toLowerCase().includes(q) ||
                          (ev.description || '').toLowerCase().includes(q) ||
                          (ev.location || '').toLowerCase().includes(q)
                        );
                      })
                      .sort((a, b) => {
                        const da = new Date(a.date).getTime();
                        const db = new Date(b.date).getTime();
                        return eventSortAsc ? da - db : db - da;
                      })
                      .map((event) => (
                      <div key={event.id} className="club-detail-event-card">
                        <div className="club-detail-event-header">
                          <Calendar className="club-detail-event-icon" />
                          <span className="club-detail-event-date">
                            {formatDate(event.date)}
                          </span>
                        </div>
                        <h4 className="club-detail-event-title">{event.title}</h4>
                        <p className="club-detail-event-description">{event.description}</p>
                        {event.location && (
                          <div className="club-detail-event-meta">
                            <div className="club-detail-event-location">
                              <span>📍</span>
                              <span>{event.location}</span>
                            </div>
                          </div>
                        )}
                        <div className="club-detail-mt-3">
                          <button
                            onClick={() => downloadEventAsICS(event)}
                            className="club-detail-event-join"
                          >
                            Takvime Ekle (.ics)
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="club-detail-events-empty">
                    <Calendar className="club-detail-events-empty-icon" />
                    <p>Henüz etkinlik planlanmamış.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "announcements" && (
            <div className="tab-content">
              <div className="announcements-container">
                <div className="club-detail-announcements-header">
                  <h3 className="club-detail-announcements-title">Duyurular</h3>
                  <div className="club-detail-announcements-search">
                    <div className="relative">
                      <Search size={16} className="club-detail-members-search-icon" />
                      <input
                        type="text"
                        value={announcementQuery}
                        onChange={(e) => setAnnouncementQuery(e.target.value)}
                        placeholder="Duyuru ara..."
                        className="club-detail-announcements-search-input"
                      />
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                        className="btn-green"
                      >
                        {showAnnouncementForm ? 'Formu Gizle' : '+ Yeni Duyuru'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Announcement Creation Form */}
                {showAnnouncementForm && isAdmin && (
                  <div className="announcement-form">
                                          <h4 className="club-detail-section-title">Yeni Duyuru Ekle</h4>
                    <form className="club-detail-form-spacing" onSubmit={async (e) => {
                      e.preventDefault();
                      if (anTitle.trim() && anContent.trim()) {
                        try {
                          const announcementData = {
                            title: anTitle,
                            content: anContent
                          };
                          
                          const { error } = await ClubService.createAnnouncement(clubId, announcementData);
                          if (error) {
                            toast.error('Duyuru eklenirken hata oluştu');
                          } else {
                            toast.success('Duyuru başarıyla eklendi!');
                            setAnTitle('');
                            setAnContent('');
                            setShowAnnouncementForm(false);
                            // Refresh club data
                            fetchClub(clubId);
                          }
                        } catch {
                          toast.error('Duyuru eklenirken hata oluştu');
                        }
                      } else {
                        toast.error('Lütfen tüm alanları doldurun');
                      }
                    }}>
                      <div>
                        <label className="club-detail-form-label">
                          Duyuru Başlığı
                        </label>
                        <input
                          type="text"
                          value={anTitle}
                          onChange={(e) => setAnTitle(e.target.value)}
                          className="club-detail-form-input"
                          placeholder="Duyuru başlığı..."
                        />
                      </div>
                      <div>
                                                <label className="club-detail-form-label">
                          Duyuru İçeriği
                        </label>
                        <textarea
                          value={anContent}
                          onChange={(e) => setAnContent(e.target.value)}
                          className="club-detail-form-input"
                          rows={4}
                          placeholder="Duyuru içeriği..."
                        />
                      </div>
                      <div className="club-detail-flex-gap-2">
                        <button
                          type="submit"
                          className="btn-purple-600"
                        >
                          Duyuru Ekle
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAnnouncementForm(false)}
                          className="btn-gray-500"
                        >
                          İptal
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {club.announcements && club.announcements.length > 0 ? (
                  <div className="announcements-list club-detail-announcements-list">
                    {club.announcements
                      .filter(a => {
                        const q = announcementQuery.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          a.title.toLowerCase().includes(q) ||
                          (a.content || '').toLowerCase().includes(q)
                        );
                      })
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((announcement) => (
                      <div key={announcement.id} className="club-detail-announcement-item">
                        <div className="club-detail-announcement-header">
                          <Megaphone className="club-detail-announcement-icon" />
                          <span className="club-detail-announcement-date">
                            {formatDate(announcement.createdAt)}
                          </span>
                        </div>
                        <h4 className="club-detail-announcement-title">{announcement.title}</h4>
                        <p className="club-detail-announcement-content">{announcement.content}</p>
                        <div className="club-detail-announcement-meta">
                          Yayınlayan: {announcement.createdBy?.name || 'Bilinmeyen'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="club-detail-announcements-empty">
                    <Megaphone className="club-detail-announcements-empty-icon" />
                    <p>Henüz duyuru yok.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "gallery" && (
            <div className="tab-content">
              <div className="gallery-container">
                <h3 className="club-detail-gallery-title">Kulüp Galerisi</h3>
                
                {/* Social Media Links */}
                <div className="club-detail-gallery-social">
                  <h4 className="club-detail-gallery-social-title">Sosyal Medya Hesapları</h4>
                  <div className="club-detail-gallery-social-grid">
                    {club.socialLinks?.website && (
                      <a
                        href={club.socialLinks.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="club-detail-social-media-link club-detail-social-media-link-blue"
                      >
                        <Globe className="icon-small" />
                        Website
                      </a>
                    )}
                    {club.socialLinks?.instagram && (
                      <a
                        href={`https://instagram.com/${club.socialLinks.instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="club-detail-social-media-link club-detail-social-media-link-pink"
                      >
                        <Instagram className="icon-small" />
                        Instagram
                      </a>
                    )}
                    {club.socialLinks?.twitter && (
                      <a
                        href={`https://twitter.com/${club.socialLinks.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="club-detail-social-media-link club-detail-social-media-link-light-blue"
                      >
                        <Twitter className="icon-small" />
                        Twitter
                      </a>
                    )}
                    {club.socialLinks?.discord && (
                      <a
                        href={club.socialLinks.discord}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="club-detail-social-media-link club-detail-social-media-link-indigo"
                      >
                        <MessageSquare className="icon-small" />
                        Discord
                      </a>
                    )}
                  </div>
                </div>

                {/* Photo Gallery Placeholder */}
                <div className="photo-gallery">
                                        <h4 className="club-detail-gallery-title">Fotoğraf Galerisi</h4>
                  <div className="club-detail-empty-text club-detail-empty-border">
                    <ImageIcon className="club-detail-empty-icon" />
                    <p>Fotoğraf galerisi yakında eklenecektir.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "admin" && (
            <div className="tab-content">
              <div className="admin-container">
                                    <h3 className="club-detail-admin-panel-title">Yönetim Paneli</h3>
                
                {!isAdmin ? (
                  <div className="club-detail-empty-text">
                    <SettingsIcon className="club-detail-empty-icon" />
                    <p>Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
                  </div>
                ) : (
                  <div className="admin-sections club-detail-admin-sections">
                    {/* Club Information Editing */}
                    <div className="club-detail-admin-section">
                      <h4 className="club-detail-section-title">Kulüp Bilgileri</h4>
                      <div className="club-detail-admin-section-spacing">
                        <div>
                          <label className="club-detail-form-label">
                            Açıklama
                          </label>
                          <textarea
                            value={editedDescription}
                            onChange={(e) => setEditedDescription(e.target.value)}
                                                      className="club-detail-input-field"
                          rows={3}
                          placeholder="Kulüp açıklaması..."
                          />
                        </div>
                        <div className="club-detail-form-grid-2">
                          <div>
                                                      <label className="club-detail-form-label">
                            Website
                          </label>
                            <input
                              type="url"
                              value={socialLinks.website}
                              onChange={(e) => setSocialLinks(prev => ({ ...prev, website: e.target.value }))}
                              className="club-detail-input-field"
                              placeholder="https://example.com"
                            />
                          </div>
                          <div>
                            <label className="club-detail-form-label">
                              Instagram
                            </label>
                            <input
                              type="text"
                              value={socialLinks.instagram}
                              onChange={(e) => setSocialLinks(prev => ({ ...prev, instagram: e.target.value }))}
                              className="club-detail-input-field"
                              placeholder="kullanici_adi"
                            />
                          </div>
                        </div>
                        <div className="club-detail-flex-gap-2">
                          <button
                            onClick={handleSave}
                            disabled={updateClubMutation.isPending}
                            className="club-detail-button-blue"
                          >
                            {updateClubMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                          </button>
                          <button
                            onClick={handleCancel}
                            className="club-detail-button-gray"
                          >
                            İptal
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Member Management */}
                    <div className="club-detail-admin-section">
                      <h4 className="club-detail-section-title">Üye Yönetimi</h4>
                      <div className="members-list">
                        {club.members.map((member) => (
                                                      <div key={member.userId} className="club-detail-flex-between-center club-detail-member-padding club-detail-member-bg club-detail-rounded">
                            <div className="club-detail-flex-gap-3">
                              <div className="club-detail-member-avatar club-detail-flex-center-center club-detail-text-sm">
                                {member.name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <p className="club-detail-member-name">{member.name}</p>
                                <p className="club-detail-member-email">{member.email}</p>
                              </div>
                            </div>
                            <div className="club-detail-flex-items-gap-2">
                              <span className={`club-detail-role-badge ${
                                member.role === 'admin' ? 'club-detail-role-badge-admin' : 'club-detail-role-badge-member'
                              }`}>
                                {member.role === 'admin' ? 'Admin' : 'Üye'}
                              </span>
                              {member.role !== 'admin' && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const { error } = await ClubService.changeMemberRole(clubId, member.userId, 'admin');
                                      if (error) {
                                        toast.error('Rol değiştirilemedi');
                                      } else {
                                        toast.success('Rol başarıyla değiştirildi');
                                        fetchClub(clubId);
                                      }
                                    } catch {
                                      toast.error('Rol değiştirilemedi');
                                    }
                                  }}
                                  className="club-detail-button-yellow"
                                >
                                  Admin Yap
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>


                    {/* Event Creation */}
                    {/* This section is now handled by the inline form */}

                    {/* Announcement Creation */}
                    {/* This section is now handled by the inline form */}

                    {/* Member Invitation */}
                    <div className="club-detail-admin-section">
                      <h4 className="club-detail-section-title">Üye Davet Et</h4>
                      <div className="club-detail-admin-section-spacing">
                        <div>
                                                      <label className="club-detail-form-label">
                              Kullanıcı ID veya Email
                            </label>
                          <input
                            type="text"
                            value={inviteId}
                            onChange={(e) => setInviteId(e.target.value)}
                            className="club-detail-input-field"
                            placeholder="Kullanıcı ID veya email..."
                          />
                        </div>
                        <button
                          onClick={async () => {
                            if (inviteId.trim()) {
                              try {
                                const { error } = await ClubService.inviteMember(clubId, inviteId, 'member');
                                if (error) {
                                  toast.error('Davet gönderilemedi');
                                } else {
                                  toast.success('Davet gönderildi!');
                                  setInviteId('');
                                  setInviteSent(true);
                                  setTimeout(() => setInviteSent(false), 3000);
                                }
                              } catch {
                                toast.error('Davet gönderilemedi');
                              }
                            } else {
                              toast.error('Lütfen kullanıcı bilgisini girin');
                            }
                          }}
                          className="club-detail-button-indigo"
                        >
                          Davet Gönder
                        </button>
              {inviteSent && (
                          <p className="club-detail-success-message">Davet başarıyla gönderildi!</p>
              )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
        )}
      </LoadingState>
    </ModernDashboardLayout>
  );
};

export default ClubDetailPage;
