import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "../../contexts/AuthContext";
import { DormitoryService } from "../../utils/apiService";
import { toast } from "sonner";
import ModernDashboardLayout from "../../components/ModernDashboardLayout";
import { 
  ArrowLeft, 
  Wrench, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react";
import './MaintenanceRequestPage.css';

interface MaintenanceRequest {
  _id: string;
  studentId: string;
  studentName: string;
  roomNumber: string;
  issue: string;
  status: "pending" | "in_progress" | "completed";
  adminNote?: string;
  serviceNote?: string;
  createdAt: string;
  updatedAt: string;
}

export default function MaintenanceRequestPage() {
  // navigate kaldırıldı
  const { user: authUser, isLoading: authLoading } = useAuthContext();
  
  // Get status color based on status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "#f59e0b"; // Amber
      case "in_progress": return "#3b82f6"; // Blue
      case "completed": return "#10b981"; // Emerald
      default: return "#6b7280"; // Gray
    }
  };
  
  // State for requests and loading
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // User role states
  const [isStudent, setIsStudent] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isHizmetli, setIsHizmetli] = useState(false);
  
  // Form states for new request
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [issue, setIssue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Form states for updating request
  const [editingRequest, setEditingRequest] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [serviceNote, setServiceNote] = useState("");
  const [updating, setUpdating] = useState(false);

  // Fetch user and maintenance requests
  const fetchUserAndRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if authUser exists
      if (!authUser) {
        setError("Kullanıcı bilgileri yüklenemedi. Lütfen giriş yapın.");
        setLoading(false);
        return;
      }
      
      // Set user role states based on authUser
      const role = (authUser as { rol: string })?.rol;
      setIsStudent(role === "student");
      setIsAdmin(role === "admin");
      setIsHizmetli(role === "hizmetli");
      
      // Fetch maintenance requests based on role
      if (role === "student") {
        const { data, error } = await DormitoryService.getMyMaintenanceRequests();
        if (error) {
          toast.error(error);
          setError("Bakım talepleri yüklenirken bir hata oluştu.");
        } else {
          setRequests(data as MaintenanceRequest[]);
        }
      } else {
        const { data, error } = await DormitoryService.getMaintenanceRequests();
        if (error) {
          toast.error(error);
          setError("Bakım talepleri yüklenirken bir hata oluştu.");
        } else {
          setRequests(data as MaintenanceRequest[]);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Bakım talepleri yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.");
      toast.error("Veri yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    if (!authLoading) {
      fetchUserAndRequests();
    }
  }, [fetchUserAndRequests, authLoading]);

  // Handle new request submission
  const handleNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim() || !issue.trim()) {
      toast.error("Lütfen tüm alanları doldurun");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await DormitoryService.createMaintenanceRequest({
        roomNumber: roomNumber.trim(),
        issue: issue.trim()
      });

      if (error) {
        toast.error(error);
      } else {
        toast.success("Bakım talebi başarıyla oluşturuldu");
        setRoomNumber("");
        setIssue("");
        setShowNewRequestForm(false);
        fetchUserAndRequests(); // Refresh the list
      }
    } catch (error) {
      console.error("Error creating request:", error);
      toast.error("Bakım talebi oluşturulurken bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle request update
  const handleUpdateRequest = async (requestId: string) => {
    if (!status.trim()) {
      toast.error("Lütfen durum seçin");
      return;
    }

    setUpdating(true);
    try {
      const updateData: { status: string; adminNote?: string; serviceNote?: string } = { status };
      if (adminNote.trim()) updateData.adminNote = adminNote.trim();
      if (serviceNote.trim()) updateData.serviceNote = serviceNote.trim();

      const { error } = await DormitoryService.updateMaintenanceRequest(requestId, updateData);

      if (error) {
        toast.error(error);
      } else {
        toast.success("Bakım talebi başarıyla güncellendi");
        setEditingRequest(null);
        setStatus("");
        setAdminNote("");
        setServiceNote("");
        fetchUserAndRequests(); // Refresh the list
      }
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error("Bakım talebi güncellenirken bir hata oluştu");
    } finally {
      setUpdating(false);
    }
  };

  // Handle request deletion
  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm("Bu bakım talebini silmek istediğinize emin misiniz?")) {
      return;
    }

    try {
      const { error } = await DormitoryService.deleteMaintenanceRequest(requestId);

      if (error) {
        toast.error(error);
      } else {
        toast.success("Bakım talebi başarıyla silindi");
        fetchUserAndRequests(); // Refresh the list
      }
    } catch (error) {
      console.error("Error deleting request:", error);
      toast.error("Bakım talebi silinirken bir hata oluştu");
    }
  };

  // Get status display text
  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return "Beklemede";
      case "in_progress": return "İşlemde";
      case "completed": return "Tamamlandı";
      default: return status;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="status-icon" />;
      case "in_progress": return <AlertCircle className="status-icon" />;
      case "completed": return <CheckCircle2 className="status-icon" />;
      default: return <Clock className="status-icon" />;
    }
  };

  if (loading || authLoading) {
    return (
      <div className="admin-panel">
        <header className="panel-header">
          <div className="header-left">
            <div className="panel-logo">
              <div className="panel-logo-icon">
                <Wrench className="icon" />
              </div>
              <div className="panel-logo-text">
                <h1 className="page-title">
                  Bakım Talepleri
                </h1>
              </div>
            </div>
          </div>
          <div className="header-right">
          </div>
        </header>

        <main className="panel-main">
          <div className="loading-container">
            <Loader2 className="loading-spinner" />
            <p>Bakım talepleri yükleniyor...</p>
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
                <Wrench className="icon" />
              </div>
              <div className="panel-logo-text">
                <h1 className="page-title">
                  Bakım Talepleri
                </h1>
              </div>
            </div>
          </div>
          <div className="header-right">
          </div>
        </header>

        <main className="panel-main">
          <div className="error-container">
            <AlertCircle className="error-icon" />
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="button button--secondary"
            >
              Tekrar Dene
            </button>
          </div>
        </main>
      </div>
    );
  }

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${authUser?.rol || 'student'}` },
    { label: 'Bakım Talepleri' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Bakım Talepleri"
      breadcrumb={breadcrumb}
    >
      <div className="admin-panel">
        {/* Header */}
        <header className="panel-header">
          <div className="header-left">
            <div className="panel-logo">
              <div className="panel-logo-icon">
                <Wrench className="icon" />
              </div>
              <div className="panel-logo-text">
                <Link to="/admin" className="back-link">
                  <ArrowLeft className="back-icon" />
                  <span>Geri Dön</span>
                </Link>
                <h1 className="page-title">
                  Bakım Talepleri
                </h1>
              </div>
          </div>
        </div>
        <div className="header-right">
        </div>
      </header>

      <main className="panel-main">
        <div className="content-header">
          <div className="header-actions">
            {isStudent && (
              <button
                onClick={() => setShowNewRequestForm(true)}
                className="button button--primary"
                disabled={submitting}
              >
                <Plus className="icon" />
                <span>Yeni Talep</span>
              </button>
            )}
          </div>
        </div>

        {/* New Request Form */}
        {showNewRequestForm && (
          <div className="form-container">
            <div className="form-header">
              <h3>Yeni Bakım Talebi</h3>
              <button
                onClick={() => setShowNewRequestForm(false)}
                className="close-button"
                disabled={submitting}
              >
                <X className="icon" />
              </button>
            </div>
            
            <form onSubmit={handleNewRequest} className="form">
              <div className="form-group">
                <label htmlFor="roomNumber">Oda Numarası:</label>
                <input
                  id="roomNumber"
                  type="text"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="Oda numarasını girin"
                  required
                  disabled={submitting}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="issue">Sorun Açıklaması:</label>
                <textarea
                  id="issue"
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="Sorunu detaylı olarak açıklayın"
                  rows={4}
                  required
                  disabled={submitting}
                />
              </div>
              
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowNewRequestForm(false)}
                  className="button button--secondary"
                  disabled={submitting}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="button button--primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="icon spin" />
                      <span>Gönderiliyor...</span>
                    </>
                  ) : (
                    <>
                      <Save className="icon" />
                      <span>Gönder</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Requests List */}
        <div className="requests-section">
          <h3 className="section-title">
            <Wrench className="section-icon" />
            Bakım Talepleri
          </h3>
          
          {requests.length === 0 ? (
            <div className="empty-state">
              <Wrench className="empty-icon" />
              <h3>Henüz bakım talebi yok</h3>
              <p>Bakım talepleri burada görünecektir.</p>
            </div>
          ) : (
            <div className="requests-grid">
              {requests.map((request) => (
                <div key={request._id} className="request-card">
                  <div className="card-header">
                    <div className="card-title">
                      <h4>Oda {request.roomNumber}</h4>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(request.status) }}
                      >
                        {getStatusIcon(request.status)}
                        {getStatusText(request.status)}
                      </span>
                    </div>
                    <div className="card-meta">
                      <span className="student-name">{request.studentName}</span>
                      <span className="date">
                        {new Date(request.createdAt).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="card-content">
                    <p className="issue-description">{request.issue}</p>
                    
                    {request.adminNote && (
                      <div className="note admin-note">
                        <strong>Admin Notu:</strong> {request.adminNote}
                      </div>
                    )}
                    
                    {request.serviceNote && (
                      <div className="note service-note">
                        <strong>Servis Notu:</strong> {request.serviceNote}
                      </div>
                    )}
                  </div>
                  
                  <div className="card-actions">
                    {(isAdmin || isHizmetli) && (
                      <button
                        onClick={() => setEditingRequest(request._id)}
                        className="button button--secondary"
                        disabled={updating}
                      >
                        <Edit className="icon" />
                        <span>Düzenle</span>
                      </button>
                    )}
                    
                    {(isAdmin || isHizmetli) && (
                      <button
                        onClick={() => handleDeleteRequest(request._id)}
                        className="button button--danger"
                        disabled={updating}
                      >
                        <Trash2 className="icon" />
                        <span>Sil</span>
                      </button>
                    )}
                  </div>
                  
                  {/* Edit Form */}
                  {editingRequest === request._id && (
                    <div className="edit-form">
                      <div className="form-group">
                        <label htmlFor={`status-${request._id}`}>Durum:</label>
                        <select
                          id={`status-${request._id}`}
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="form-select"
                          required
                        >
                          <option value="">Durum Seçin</option>
                          <option value="pending">Beklemede</option>
                          <option value="in_progress">İşlemde</option>
                          <option value="completed">Tamamlandı</option>
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor={`adminNote-${request._id}`}>Admin Notu:</label>
                        <textarea
                          id={`adminNote-${request._id}`}
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                          placeholder="Admin notu ekleyin (opsiyonel)"
                          rows={2}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor={`serviceNote-${request._id}`}>Servis Notu:</label>
                        <textarea
                          id={`serviceNote-${request._id}`}
                          value={serviceNote}
                          onChange={(e) => setServiceNote(e.target.value)}
                          placeholder="Servis notu ekleyin (opsiyonel)"
                          rows={2}
                        />
                      </div>
                      
                      <div className="form-actions">
                        <button
                          onClick={() => setEditingRequest(null)}
                          className="button button--secondary"
                          disabled={updating}
                        >
                          İptal
                        </button>
                        <button
                          onClick={() => handleUpdateRequest(request._id)}
                          className="button button--primary"
                          disabled={updating}
                        >
                          {updating ? (
                            <>
                              <Loader2 className="icon spin" />
                              <span>Güncelleniyor...</span>
                            </>
                          ) : (
                            <>
                              <Save className="icon" />
                              <span>Güncelle</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      </div>
    </ModernDashboardLayout>
  );
}