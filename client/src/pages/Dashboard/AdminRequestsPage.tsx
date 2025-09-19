import { useEffect, useState, useCallback } from "react";
// import { useNavigate } from "react-router-dom"; // Not used
import { Check, X, Loader2, CheckCircle, XCircle, FileText, User } from 'lucide-react';
import { toast } from "sonner";
import { RequestService, NotificationService, UserService } from "../../utils/apiService";
import BackButton from "../../components/BackButton";
import ModernDashboardLayout from "../../components/ModernDashboardLayout";
// import { useAuthContext } from "../../contexts/AuthContext"; // Not used
import { Request as RequestType } from "../../@types";
import { useLoadingState } from "../../hooks/useLoadingState";
import { useErrorHandler } from "../../hooks/useErrorHandler";
// import tflLogo from '../../tfllogo.jpg'; // Not used
import './AdminRequestsPage.css';

export default function AdminRequestsPage() {
  // const navigate = useNavigate(); // Not used
  // const { } = useAuthContext(); // Not used
  const [requests, setRequests] = useState<RequestType[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  
  const { loading, startLoading, setSuccess, setError: setLoadingError } = useLoadingState();
  const { setError, handleAsyncError } = useErrorHandler();

  // const handleBack = () => { // Not used
  //   navigate('/admin');
  // };

  const fetchRequests = useCallback(async () => {
    startLoading();
    const { data, error } = await RequestService.getRequests();
    if (error) {
      setError(error);
      setLoadingError();
    } else {
      setRequests(Array.isArray(data) ? (data as RequestType[]) : ((data as { data: RequestType[] })?.data || []));
      setSuccess();
    }
  }, [startLoading, setError, setLoadingError, setSuccess]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleAction = async (req: RequestType, status: "approved"|"rejected") => {
    setProcessing(req._id);
    
    const result = await handleAsyncError(async () => {
      // 1. Talep durumunu güncelle
      if (status === "approved") {
        await RequestService.approveRequest(req._id, {});
      } else {
        await RequestService.rejectRequest(req._id);
      }
      
      // 2. Gerekirse kullanıcı bilgisini güncelle
      if (status === "approved") {
        if (req.type === "class-change") {
          await UserService.updateUser(req.userId, {
            sinif: req.details.sinif,
            sube: req.details.sube,
          });
        } else if (req.type === "room-change") {
          await UserService.updateUser(req.userId, {
            oda: req.details.oda,
          });
        }
      }
      // 3. Kullanıcıya bildirim gönder
      const { error: notificationError } = await NotificationService.createNotification({
        userId: req.userId,
        type: "request",
        message: status === "approved"
          ? (req.type === "class-change" ? `Sınıf/şube değişikliği talebin onaylandı.` : `Oda değişikliği talebin onaylandı.`)
          : (req.type === "class-change" ? `Sınıf/şube değişikliği talebin reddedildi.` : `Oda değişikliği talebin reddedildi.`),
        meta: req.details,
      });
      if (notificationError) {
        console.error('Error creating notification:', notificationError);
        toast.error("Bildirim gönderilemedi");
      }
      toast.success("İşlem başarılı");
      fetchRequests();
      return true;
    }, "İşlem sırasında bir hata oluştu");
    
    if (!result) {
      toast.error("İşlem başarısız");
    }
    
    setProcessing(null);
  };

  if (loading) {
    return (
      <div className="centered-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <ModernDashboardLayout
      pageTitle="Talep Yönetimi"
      breadcrumb={[
        { label: 'Ana Sayfa', path: '/admin' },
        { label: 'Talep Yönetimi' }
      ]}
    >
      <div className="welcome-section">
        <BackButton />
        <div className="welcome-card">
          <div className="welcome-content">
            <div className="welcome-text">
              <h2>Talep Yönetimi</h2>
              <p>Kullanıcı taleplerini görüntüleyin ve yönetin</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">

        <div className="dashboard-grid">
          {requests.length === 0 ? (
            <div className="empty-state">
              <FileText className="empty-icon" />
              <h3>Henüz talep bulunmuyor</h3>
              <p>İşlenmemiş talep bulunmamaktadır.</p>
            </div>
          ) : (
            requests.map(req => (
              <div key={req._id} className="dashboard-card">
                <div className="card-header">
                  <h3 className="card-title">
                    {req.type === "class-change" 
                      ? "Sınıf/Şube Değişikliği" 
                      : req.type === "room-change" 
                        ? "Oda Değişikliği" 
                        : req.type}
                  </h3>
                  <div className="card-meta">
                    <span className={`status-badge status-${req.status}`}>
                      {req.status === "pending" 
                        ? "Bekliyor" 
                        : req.status === "approved" 
                          ? "Onaylandı" 
                          : "Reddedildi"}
                    </span>
                  </div>
                </div>
                
                <div className="card-content">
                  <div className="user-info">
                    <User className="icon" />
                    <span>{req.userId}</span>
                  </div>
                  
                  <div className="request-details">
                    {req.type === "class-change" && (
                      <div className="detail-item">
                        <span className="detail-label">Sınıf/Şube:</span>
                        <span className="detail-value">{req.details.sinif || "-"}/{req.details.sube || "-"}</span>
                      </div>
                    )}
                    {req.type === "room-change" && (
                      <div className="detail-item">
                        <span className="detail-label">Oda:</span>
                        <span className="detail-value">{req.details.oda}</span>
                      </div>
                    )}
                    {req.type !== "class-change" && req.type !== "room-change" && (
                      <div className="detail-item">
                        <span className="detail-label">Detaylar:</span>
                        <span className="detail-value">{JSON.stringify(req.details)}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="card-footer">
                  {req.status === "pending" && (
                    <div className="action-buttons">
                      <button 
                        className="btn-accept"
                        onClick={() => handleAction(req, "approved")}
                        disabled={!!processing}
                      >
                        {processing === req._id ? (
                          <Loader2 className="spinner" />
                        ) : (
                          <>
                            <Check size={16} className="icon" />
                            <span>Onayla</span>
                          </>
                        )}
                      </button>
                      <button 
                        className="btn-reject"
                        onClick={() => handleAction(req, "rejected")}
                        disabled={!!processing}
                      >
                        {processing === req._id ? (
                          <Loader2 className="spinner" />
                        ) : (
                          <>
                            <X size={16} className="icon" />
                            <span>Reddet</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  {req.status === "approved" && (
                    <div className="status-info">
                      <CheckCircle className="icon approved" />
                      <span>Onaylandı</span>
                    </div>
                  )}
                  {req.status === "rejected" && (
                    <div className="status-info">
                      <XCircle className="icon rejected" />
                      <span>Reddedildi</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </ModernDashboardLayout>
  );
}