import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { DormitoryService } from "../../utils/apiService";
import { toast } from "react-toastify";
import { FileText, Loader2, RefreshCw, Upload, Calendar, Download, GraduationCap, ArrowLeft, Trash2, Users } from 'lucide-react';
import BackButton from "../../components/BackButton";
import ModernDashboardLayout from "../../components/ModernDashboardLayout";
import './SupervisorListPage.css';

interface User {
  adSoyad: string;
  email: string;
  role?: string;
}

interface SupervisorList {
  _id: string;
  month: string;
  year: number;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

export default function SupervisorListPage() {
  useAuth(["admin", "hizmetli", "teacher", "parent", "student"]);
  const { user } = useAuth();
  const [supervisorLists, setSupervisorLists] = useState<SupervisorList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMonth, setUploadMonth] = useState("");
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    if (user) {
      setUserRole(user.rol || '');
    }
  }, [user]);

  const isAdmin = userRole === "admin";
  const isHizmetli = userRole === "hizmetli";
  const isAdminOrHizmetli = isAdmin || isHizmetli;

  const fetchSupervisorLists = useCallback(async () => {
    try {
      setError("");
      const params = new URLSearchParams();
      if (selectedMonth) params.append("month", selectedMonth);
      if (selectedYear) params.append("year", selectedYear.toString());

      const { data, error } = await DormitoryService.getSupervisors({ 
        month: selectedMonth, 
        year: selectedYear 
      });
      if (error) {
        setError(error);
      } else {
        setSupervisorLists(data as SupervisorList[]);
      }
    } catch (error) {
      console.error("Error fetching supervisor lists:", error);
      setError("Belletmen listeleri yüklenirken hata oluştu");
      toast.error("Belletmen listeleri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchSupervisorLists();
  }, [fetchSupervisorLists]);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadMonth || !uploadYear) {
      toast.error("Lütfen tüm alanları doldurun");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("month", uploadMonth);
    formData.append("year", uploadYear.toString());

    try {
      const { error } = await DormitoryService.createSupervisor(formData);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Belletmen listesi başarıyla yüklendi");
        setSelectedFile(null);
        setUploadMonth("");
        setUploadYear(new Date().getFullYear());
        await fetchSupervisorLists();
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Dosya yüklenirken hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id: string, month: string, year: number) => {
    try {
      const response = await DormitoryService.downloadSupervisor(id);
      const url = window.URL.createObjectURL(new Blob([(response as any).data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `belletmen-listesi-${month || "tum"}-${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Dosya indiriliyor...");
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Dosya indirilirken hata oluştu. Lütfen tekrar deneyin.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bu listeyi silmek istediğinize emin misiniz?")) {
      try {
        const { error } = await DormitoryService.deleteSupervisor(id);
        if (error) {
          toast.error(error);
        } else {
          toast.success("Liste başarıyla silindi");
          await fetchSupervisorLists();
        }
      } catch (error) {
        console.error("Error deleting supervisor list:", error);
        toast.error("Liste silinirken hata oluştu");
      }
    }
  };
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchSupervisorLists();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  const getMonthName = (month: string) => {
    const months: { [key: string]: string } = {
      "01": "Ocak",
      "02": "Şubat",
      "03": "Mart",
      "04": "Nisan",
      "05": "Mayıs",
      "06": "Haziran",
      "07": "Temmuz",
      "08": "Ağustos",
      "09": "Eylül",
      "10": "Ekim",
      "11": "Kasım",
      "12": "Aralık",
    };
    return months[month] || month;
  };

  if (loading) {
    return (
      <ModernDashboardLayout
        pageTitle="Belletmen Listesi"
        breadcrumb={[
          { label: 'Ana Sayfa', path: `/${userRole}` },
          { label: 'Belletmen Listesi' }
        ]}
      >
        <div className="centered-spinner">
          <div className="spinner"></div>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout
      pageTitle="Belletmen Listesi"
      breadcrumb={[
        { label: 'Ana Sayfa', path: `/${userRole}` },
        { label: 'Belletmen Listesi' }
      ]}
    >
      <div className="welcome-section">
        <BackButton />
        <div className="welcome-card">
          <div className="welcome-content">
            <div className="welcome-text">
              <h2>Belletmen Listesi</h2>
              <p>Pansiyon belletmen listelerini görüntüleyin ve yönetin</p>
            </div>
            <div className="welcome-actions">
              <button
                onClick={handleRefresh}
                className="btn-blue"
                disabled={isRefreshing}
              >
                <RefreshCw className={`icon ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Yenile</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
          {/* Filter Section */}
          <div className="filters-section">
            <h3 className="filters-title">Filtreler</h3>
            <form className="filters-form">
              <div className="form-group">
                <label htmlFor="month-filter" className="form-label">Ay:</label>
                <select
                  id="month-filter"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="form-select"
                >
                  <option value="">Tüm Aylar</option>
                  <option value="01">Ocak</option>
                  <option value="02">Şubat</option>
                  <option value="03">Mart</option>
                  <option value="04">Nisan</option>
                  <option value="05">Mayıs</option>
                  <option value="06">Haziran</option>
                  <option value="07">Temmuz</option>
                  <option value="08">Ağustos</option>
                  <option value="09">Eylül</option>
                  <option value="10">Ekim</option>
                  <option value="11">Kasım</option>
                  <option value="12">Aralık</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="year-filter" className="form-label">Yıl:</label>
                <select
                  id="year-filter"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="form-select"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              <div className="filter-actions">
                <button
                  onClick={handleRefresh}
                  className="refresh-button"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`icon-small ${isRefreshing ? 'animate-spin' : ''}`} />
                  Yenile
                </button>
              </div>
            </form>
          </div>

          {/* Upload Section (Admin Only) */}
          {isAdminOrHizmetli && (
            <div className="upload-section">
              <h3 className="upload-title">
                <Upload className="icon-medium" />
                Yeni Belletmen Listesi Yükle
              </h3>
              <form onSubmit={handleFileUpload} className="upload-form">
                <div className="form-group">
                  <label htmlFor="month-upload" className="form-label">Ay:</label>
                  <select
                    id="month-upload"
                    value={uploadMonth}
                    onChange={(e) => setUploadMonth(e.target.value)}
                    className="form-select"
                    required
                  >
                    <option value="">Ay Seçin</option>
                    <option value="01">Ocak</option>
                    <option value="02">Şubat</option>
                    <option value="03">Mart</option>
                    <option value="04">Nisan</option>
                    <option value="05">Mayıs</option>
                    <option value="06">Haziran</option>
                    <option value="07">Temmuz</option>
                    <option value="08">Ağustos</option>
                    <option value="09">Eylül</option>
                    <option value="10">Ekim</option>
                    <option value="11">Kasım</option>
                    <option value="12">Aralık</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="year-upload" className="form-label">Yıl:</label>
                  <select
                    id="year-upload"
                    value={uploadYear}
                    onChange={(e) => setUploadYear(Number(e.target.value))}
                    className="form-select"
                    required
                  >
                    {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() + i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="file-upload" className="form-label">Dosya:</label>
                  <div className="file-input-container">
                    <input
                      id="file-upload"
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="file-input"
                      accept=".pdf,.doc,.docx"
                      required
                    />
                    <label htmlFor="file-upload" className="file-input-label">
                                        <Upload className="icon-small" />
                  Dosya Seç
                    </label>
                  </div>
                </div>
                
                <button
                  type="submit"
                  className="upload-button"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="icon-small animate-spin" />
                      Yükleniyor...
                    </>
                  ) : (
                    <>
                                        <Upload className="icon-small" />
                  Belletmen Listesi Yükle
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

        <div className="supervisor-lists-section">
          <h3 className="section-title">
            <FileText className="icon-medium" />
            Mevcut Belletmen Listeleri
          </h3>
          
          {supervisorLists.length === 0 ? (
            <div className="empty-state">
              <FileText className="empty-icon" />
              <h3>Henüz belletmen listesi yok</h3>
              <p>Belletmen listeleri burada görünecektir.</p>
            </div>
          ) : (
            <div className="dashboard-grid">
              {supervisorLists.map((list) => (
                <div key={list._id} className="dashboard-card">
                  <div className="card-header">
                    <div className="card-icon">
                      <FileText className="icon" />
                    </div>
                    <div className="card-badge">
                      <span>{getMonthName(list.month)} {list.year}</span>
                    </div>
                  </div>
                  
                  <div className="card-content">
                    <h3 className="card-title">
                      {getMonthName(list.month)} {list.year}
                    </h3>
                    <p className="card-subtitle">
                      Yüklenen: {formatDate(list.uploadedAt)}
                    </p>
                    <div className="card-meta">
                      <div className="meta-item">
                        <Calendar className="meta-icon" />
                        <span>Yükleyen: {list.uploadedBy}</span>
                      </div>
                    </div>
                    
                    <div className="card-footer">
                      <button
                        onClick={() => handleDownload(list._id, list.month, list.year)}
                        className="btn-blue"
                        title="İndir"
                      >
                        <Download className="icon" />
                        <span>İndir</span>
                      </button>
                      {isAdminOrHizmetli && (
                        <button
                          onClick={() => handleDelete(list._id)}
                          className="btn-red"
                          title="Sil"
                        >
                          <Trash2 className="icon" />
                          <span>Sil</span>
                        </button>
                      )}
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