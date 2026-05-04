import { useState, useEffect } from 'react';
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Users,
  Home,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { EvciService } from '../../utils/apiService';
import { toast } from 'sonner';
import './EvciStatsPage.css';
import { safeConsoleError } from '../../utils/safeLogger';

interface EvciStats {
  summary: { total: number; going: number; notGoing: number };
  weekly: { weekOf: string; total: number; going: number; notGoing: number }[];
  classDistribution: { className: string; count: number }[];
  parentApproval: { approved: number; rejected: number; pending: number };
}

const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b'];
const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

export default function EvciStatsPage() {
  const { user: authUser } = useAuthGuard(['admin', 'teacher']);
  const [stats, setStats] = useState<EvciStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weeks, setWeeks] = useState(8);

  useEffect(() => {
    if (authUser) fetchStats();
  }, [authUser, weeks]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await EvciService.getEvciStats(weeks);
      if (error) {
        toast.error('İstatistikler alınamadı: ' + error);
      } else {
        setStats(data as EvciStats);
      }
    } catch (err) {
      safeConsoleError('Error fetching stats:', err);
      toast.error('İstatistikler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${authUser?.rol || 'admin'}` },
    { label: 'Evci İstatistikleri' },
  ];

  if (isLoading) {
    return (
      <ModernDashboardLayout pageTitle="Evci İstatistikleri" breadcrumb={breadcrumb}>
        <div className="evci-stats-page">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>İstatistikler yükleniyor...</p>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  if (!stats) {
    return (
      <ModernDashboardLayout pageTitle="Evci İstatistikleri" breadcrumb={breadcrumb}>
        <div className="evci-stats-page">
          <div className="empty-state">
            <BarChart3 size={64} />
            <h3>Veri bulunamadı</h3>
            <p>Henüz istatistik oluşturacak yeterli veri yok.</p>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  const pieData = [
    { name: 'Gidecek', value: stats.summary.going },
    { name: 'Gitmeyecek', value: stats.summary.notGoing },
  ].filter((d) => d.value > 0);

  const approvalPieData = [
    { name: 'Onaylanan', value: stats.parentApproval.approved },
    { name: 'Reddedilen', value: stats.parentApproval.rejected },
    { name: 'Bekleyen', value: stats.parentApproval.pending },
  ].filter((d) => d.value > 0);

  return (
    <ModernDashboardLayout pageTitle="Evci İstatistikleri" breadcrumb={breadcrumb}>
      <div className="evci-stats-page">
        <div className="page-header">
          <div className="page-header-content">
            <div className="page-title-section">
              <BarChart3 className="page-icon" />
              <h1 className="page-title-main">Evci İstatistikleri</h1>
            </div>
            <div className="stats-controls">
              <select
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
                className="filter-select"
              >
                <option value={4}>Son 4 Hafta</option>
                <option value={8}>Son 8 Hafta</option>
                <option value={12}>Son 12 Hafta</option>
              </select>
              <Link to={`/${authUser?.rol || 'admin'}/evci-listesi`} className="btn btn-secondary">
                <ArrowLeft size={16} />
                Talep Listesi
              </Link>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-icon total">
              <Users size={24} />
            </div>
            <div className="summary-info">
              <span className="summary-value">{stats.summary.total}</span>
              <span className="summary-label">Toplam Talep</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon going">
              <Home size={24} />
            </div>
            <div className="summary-info">
              <span className="summary-value">{stats.summary.going}</span>
              <span className="summary-label">Gidecek</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon not-going">
              <Home size={24} />
            </div>
            <div className="summary-info">
              <span className="summary-value">{stats.summary.notGoing}</span>
              <span className="summary-label">Gitmeyecek</span>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          {/* Pie Chart - Going vs Not Going */}
          <div className="chart-card">
            <h3 className="chart-title">
              <PieChartIcon size={18} />
              Gidecek / Gitmeyecek
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {pieData.map((_entry, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart - Parent Approval */}
          <div className="chart-card">
            <h3 className="chart-title">
              <PieChartIcon size={18} />
              Veli Onay Durumu
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={approvalPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {approvalPieData.map((_entry, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart - Class Distribution */}
          <div className="chart-card">
            <h3 className="chart-title">
              <BarChart3 size={18} />
              Sınıf Dağılımı
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.classDistribution.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="className" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="Talep Sayısı" radius={[4, 4, 0, 0]}>
                  {stats.classDistribution.slice(0, 10).map((_entry, index) => (
                    <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart - Weekly Trend */}
          <div className="chart-card wide">
            <h3 className="chart-title">
              <TrendingUp size={18} />
              Haftalık Trend
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats.weekly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="weekOf" fontSize={11} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="going"
                  name="Gidecek"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="notGoing"
                  name="Gitmeyecek"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Toplam"
                  stroke="#6366f1"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </ModernDashboardLayout>
  );
}
