import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Calendar, MapPin, User, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import BackButton from '../../components/BackButton';
import './ParentEvciPage.css';

interface EvciTalep {
  _id: string;
  studentId: string;
  studentName: string;
  startDate: string;
  endDate: string;
  destination: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

interface Student {
  id: string;
  adSoyad: string;
  sinif?: string;
  no?: string;
}

export default function ParentEvciPage() {
  const { user: authUser, isLoading: authLoading } = useAuth(["parent"]);
  const navigate = useNavigate();
  
  const [children, setChildren] = useState<Student[]>([]);
  const [requests, setRequests] = useState<EvciTalep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string>('');
  
  // Mock data for demonstration
  const mockChildren: Student[] = [
    { id: '1', adSoyad: 'Ahmet Yılmaz', sinif: '10A', no: '123' },
    { id: '2', adSoyad: 'Ayşe Demir', sinif: '9B', no: '456' }
  ];
  
  const mockRequests: EvciTalep[] = [
    {
      _id: '1',
      studentId: '1',
      studentName: 'Ahmet Yılmaz',
      startDate: '2025-08-10T08:00:00.000Z',
      endDate: '2025-08-12T18:00:00.000Z',
      destination: 'Ankara',
      reason: 'Aile ziyareti',
      status: 'approved',
      createdAt: '2025-08-05T10:30:00.000Z',
      updatedAt: '2025-08-06T14:20:00.000Z'
    },
    {
      _id: '2',
      studentId: '1',
      studentName: 'Ahmet Yılmaz',
      startDate: '2025-08-15T08:00:00.000Z',
      endDate: '2025-08-17T18:00:00.000Z',
      destination: 'İzmir',
      status: 'pending',
      createdAt: '2025-08-08T09:15:00.000Z',
      updatedAt: '2025-08-08T09:15:00.000Z'
    }
  ];

  useEffect(() => {
    if (!authUser) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // In a real app, you would fetch from the API here
        // For demo purposes, we'll use mock data
        setChildren(mockChildren);
        
        // Set the first child as selected by default if available
        if (mockChildren.length > 0) {
          setSelectedChild(mockChildren[0].id);
          // Filter requests for the selected child
          const childRequests = mockRequests.filter(
            req => req.studentId === mockChildren[0].id
          );
          setRequests(childRequests);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Veriler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [authUser]);
  
  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // In a real app, you would refresh data from the API here
      // For demo, we'll just simulate a refresh with the same data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (selectedChild) {
        const childRequests = mockRequests.filter(
          req => req.studentId === selectedChild
        );
        setRequests(childRequests);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Veriler yenilenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleChildSelect = (childId: string) => {
    setSelectedChild(childId);
    const childRequests = mockRequests.filter(req => req.studentId === childId);
    setRequests(childRequests);
  };
  
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleString('tr-TR', options);
  };
  
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      case 'pending':
      default:
        return 'status-pending';
    }
  };
  
  const breadcrumb = [
    { label: 'Ana Sayfa', path: '/parent' },
    { label: 'Evci Çıkış İşlemleri' }
  ];

  if (isLoading) {
    return (
      <ModernDashboardLayout
        pageTitle="Evci Çıkış İşlemleri"
        breadcrumb={breadcrumb}
      >
        <div className="parent-evci-page">
          <BackButton />
          <div className="loading-container">
            <RefreshCw className="loading-icon spin" />
            <p>Yükleniyor...</p>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }
  
  if (error) {
    return (
      <ModernDashboardLayout
        pageTitle="Evci Çıkış İşlemleri"
        breadcrumb={breadcrumb}
      >
        <div className="parent-evci-page">
          <BackButton />
          <div className="error-container">
            <AlertCircle className="error-icon" />
            <h2>Hata Oluştu</h2>
            <p>{error}</p>
            <button 
              onClick={handleRefresh}
              className="btn btn-primary"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }
  
  return (
    <ModernDashboardLayout
      pageTitle="Evci Çıkış İşlemleri"
      breadcrumb={breadcrumb}
    >
      <div className="parent-evci-page">
        <BackButton />
        
        <div className="page-header">
          <div className="page-header-content">
            <div className="page-title-section">
              <Home className="page-icon" />
              <h1 className="page-title-main">Evci Çıkış İşlemleri</h1>
            </div>
            <button 
              onClick={handleRefresh}
              className="btn btn-primary"
              disabled={isLoading}
              aria-label="Yenile"
            >
              <RefreshCw className={`icon ${isLoading ? 'spin' : ''}`} />
              <span>Yenile</span>
            </button>
          </div>
        </div>

        <div className="content-card">
          <div className="card-actions">
            <div className="child-selector">
              <label htmlFor="childSelect" className="selector-label">Öğrenci Seçin:</label>
              <select 
                id="childSelect"
                value={selectedChild}
                onChange={(e) => handleChildSelect(e.target.value)}
                className="select-input"
                disabled={isLoading}
              >
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.adSoyad} {child.sinif ? `(${child.sinif})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="card-content">
            {requests.length === 0 ? (
              <div className="empty-state">
                <Home className="empty-icon" />
                <h3>Henüz evci çıkış talebi bulunmuyor</h3>
                <p>Öğrencinize ait evci çıkış talepleri burada görünecektir.</p>
              </div>
            ) : (
              <div className="parent-evci-requests-grid">
                {requests.map((request) => (
                  <div key={request._id} className="request-card">
                    <div className="request-header">
                      <h3 className="request-title">
                        {request.destination}
                      </h3>
                      <span className={`status-badge ${getStatusClass(request.status)}`}>
                        {request.status === 'approved' ? 'Onaylandı' : 
                         request.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
                      </span>
                    </div>
                    
                    <div className="request-details">
                      <div className="detail-row">
                        <Calendar className="detail-icon" />
                        <div>
                          <span className="detail-label">Tarih:</span>
                          <span className="detail-value">
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </span>
                        </div>
                      </div>
                      
                      {request.reason && (
                        <div className="detail-row">
                          <MapPin className="detail-icon" />
                          <div>
                            <span className="detail-label">Açıklama:</span>
                            <span className="detail-value">{request.reason}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="detail-row">
                        <User className="detail-icon" />
                        <div>
                          <span className="detail-label">Öğrenci:</span>
                          <span className="detail-value">{request.studentName}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="request-footer">
                      <span className="request-date">
                        Oluşturulma: {formatDate(request.createdAt)}
                      </span>
                      {request.updatedAt !== request.createdAt && (
                        <span className="request-date">
                          Güncellenme: {formatDate(request.updatedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModernDashboardLayout>
  );
}

