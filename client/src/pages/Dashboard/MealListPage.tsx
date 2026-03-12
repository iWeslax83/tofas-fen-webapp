import { useEffect, useState, useCallback } from "react";
import { Utensils, Calendar, Download, FileText, Loader2, RefreshCw, Upload } from 'lucide-react'; // ArrowLeft removed
import { useAuthContext } from "../../contexts/AuthContext";
import { DormitoryService } from "../../utils/apiService";
import { toast } from "sonner";
// import { Link } from "react-router-dom"; // Not used

import ModernDashboardLayout from "../../components/ModernDashboardLayout";
// import { 
//   SkeletonTable, // Not used
//   SkeletonCard // Not used
//   // SkeletonForm, // Not used
//   // LoadingState // Not used
// } from '../../components/SkeletonComponents';
import './MealListPage.css';

interface MealList {
  _id: string;
  month: string;
  year: number;
  uploadedAt: string;
  uploadedBy: string;
  fileUrl: string;
}

export default function MealListPage() {
  const { user } = useAuthContext();
  const [mealLists, setMealLists] = useState<MealList[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMonth, setUploadMonth] = useState('');
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  const isAdmin = userRole === "admin";
  const isHizmetli = userRole === "hizmetli";
  const isAdminOrHizmetli = isAdmin || isHizmetli;

  // Set user role on component mount
  useEffect(() => {
    if (user) {
      setUserRole((user as { rol: string }).rol || '');
    }
  }, [user]);

  // Fetch meal lists with retry mechanism
  const fetchMealLists = useCallback(async (retryCount = 0) => {
    const maxRetries = 3;

    try {
      setError(null);
      const { data, error } = await DormitoryService.getMeals({
        month: selectedMonth,
        year: selectedYear
      });

      if (error) {
        if (retryCount < maxRetries) {
          setTimeout(() => fetchMealLists(retryCount + 1), Math.pow(2, retryCount) * 1000);
          return;
        }
        setError(error);
      } else {
        setMealLists(Array.isArray(data) ? data as MealList[] : []);
      }
    } catch (err: unknown) {
      if ((err as any)?.response?.status === 429 && retryCount < maxRetries) {
        const retryAfter = (err as any)?.response?.data?.retryAfter || Math.pow(2, retryCount);
        setTimeout(() => fetchMealLists(retryCount + 1), retryAfter * 1000);
        return;
      }

      if (retryCount < maxRetries) {
        setTimeout(() => fetchMealLists(retryCount + 1), Math.pow(2, retryCount) * 1000);
        return;
      }

      setError('Yemek listeleri yüklenirken bir hata oluştu.');
      toast.error('Yemek listeleri yüklenirken bir hata oluştu.');
    } finally {
      if (retryCount === 0) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchMealLists();
  }, [fetchMealLists]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMealLists();
  };

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
      const { error } = await DormitoryService.createMeal(formData);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Yemek listesi başarıyla yüklendi");
        setSelectedFile(null);
        setUploadMonth("");
        setUploadYear(new Date().getFullYear());
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        await fetchMealLists();
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Dosya yüklenirken hata oluştu");
    } finally {
      setUploading(false);
    }
  };

  // Skeleton component for meal list - removed as not used

  const handleDownload = async (id: string) => {
    try {
      const response = await DormitoryService.downloadMeal(id);
      const blob = new Blob([(response as { data: string }).data], { type: (response as { headers?: { 'content-type'?: string } }).headers?.['content-type'] || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `yemek-listesi-${selectedMonth || "tum"}-${selectedYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Dosya indirilirken hata oluştu");
    }
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

  if (loading && !isRefreshing) {
    return (
      <div className="centered-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <ModernDashboardLayout
        pageTitle="Yemek Listesi"
        breadcrumb={[
          { label: 'Ana Sayfa', path: '/admin' },
          { label: 'Yemek Listesi' }
        ]}
      >
        <div className="error-message">
          <p>{error}</p>
          <button
            className="btn-blue"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="icon animate-spin" />
                Yenileniyor...
              </>
            ) : 'Tekrar Dene'}
          </button>
        </div>
      </ModernDashboardLayout>
    );
  }
  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Yemek Listesi' }
  ];


  return (
    <ModernDashboardLayout
      pageTitle="Yemek Listesi"
      breadcrumb={breadcrumb}
    >
      <div className="meal-list-page">
        <div className="page-header">
          <div className="page-header-content">
            <div className="page-title-section">
              <Utensils className="page-icon" />
              <div className="title-wrapper">
                <h1 className="page-title-main">Yemek Listesi</h1>
                <p className="page-subtitle">Pansiyon yemek listelerini görüntüleyin ve yönetin</p>
              </div>
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

        <div className="dashboard-content">
          <div className="filters-section">
            <h3 className="filters-title">
              <Calendar className="icon-small" />
              Filtreler
            </h3>
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

              <button
                type="button"
                onClick={handleRefresh}
                className="refresh-button"
                disabled={isRefreshing}
              >
                <RefreshCw className={`icon-small ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Filtrele</span>
              </button>
            </form>
          </div>

          {isAdminOrHizmetli && (
            <div className="upload-section">
              <h3 className="upload-title">
                <Upload className="icon-medium" />
                Yeni Yemek Listesi Yükle
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
                      {selectedFile ? selectedFile.name : 'Dosya Seç'}
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
                      Yükle
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          <div className="meal-lists-section">
            {mealLists.length === 0 ? (
              <div className="empty-state">
                <FileText className="empty-icon" />
                <h3>Henüz yemek listesi yok</h3>
                <p>Yemek listeleri burada görünecektir.</p>
              </div>
            ) : (
              <div className="dashboard-grid">
                {mealLists.map((mealList) => (
                  <div key={mealList._id} className="dashboard-card">
                    <div className="card-header">
                      <div className="card-icon">
                        <FileText className="icon" size={24} />
                      </div>
                      <div className="card-badge">
                        <span>{getMonthName(mealList.month)} {mealList.year}</span>
                      </div>
                    </div>

                    <div className="card-content">
                      <h3 className="card-title">
                        {getMonthName(mealList.month)} {mealList.year} Yemek Listesi
                      </h3>
                      <p className="card-subtitle">
                        Pansiyon yemek listesi belgesi
                      </p>

                      <div className="card-meta">
                        <div className="meta-item">
                          <Calendar className="meta-icon" />
                          <span>Yükleme: {formatDate(mealList.uploadedAt)}</span>
                        </div>
                        <div className="meta-item">
                          <FileText className="meta-icon" />
                          <span>Gönderen: {mealList.uploadedBy}</span>
                        </div>
                      </div>

                      <div className="card-footer">
                        <button
                          onClick={() => handleDownload(mealList._id)}
                          className="btn-blue"
                          title="İndir"
                        >
                          <Download className="icon" />
                          <span>Listeyi İndir</span>
                        </button>
                      </div>
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
