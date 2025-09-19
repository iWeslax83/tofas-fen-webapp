import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Zap, 
  Settings, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  HardDrive, 
  Cpu, 
  MemoryStick,
  RefreshCw,
  Play,
  Pause,
  Trash2,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  Edit,
  Save,
  X
} from 'lucide-react';
import { SecureAPI } from '../../utils/api';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import './PerformancePage.css';

interface Metric {
  id: string;
  type: string;
  category: string;
  metric: string;
  value: number;
  unit: string;
  threshold: number;
  status: string;
  context: {
    endpoint?: string;
    method?: string;
    userId?: string;
    userRole?: string;
    browser?: string;
    device?: string;
    timestamp: Date;
  };
  metadata: Record<string, any>;
  createdAt: Date;
}

interface Optimization {
  id: string;
  type: string;
  action: string;
  target: string;
  description: string;
  impact: string;
  status: string;
  results: {
    beforeMetrics: Record<string, number>;
    afterMetrics: Record<string, number>;
    improvement: number;
    duration: number;
  };
  executedBy: string;
  executedAt: Date;
  completedAt?: Date;
  error?: string;
}

interface Config {
  id: string;
  name: string;
  description: string;
  category: string;
  settings: Record<string, any>;
  isEnabled: boolean;
  priority: number;
  schedule?: {
    type: string;
    value: string;
  };
  conditions: Array<{
    threshold: number;
    operator: string;
    metric: string;
  }>;
}

interface SystemMetrics {
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  disk: {
    total: string;
    used: string;
    available: string;
    usagePercent: string;
  };
  timestamp: Date;
}

const PerformancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'metrics' | 'optimizations' | 'configs'>('dashboard');
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [optimizations, setOptimizations] = useState<Optimization[]>([]);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Fetch data based on active tab
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      switch (activeTab) {
        case 'dashboard':
          await fetchDashboardData();
          break;
        case 'metrics':
          await fetchMetrics();
          break;
        case 'optimizations':
          await fetchOptimizations();
          break;
        case 'configs':
          await fetchConfigs();
          break;
      }
    } catch (err: any) {
      setError(err.message || 'Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    const [dashboardData, systemData] = await Promise.all([
      SecureAPI.get('/performance/dashboard'),
      SecureAPI.get('/performance/system')
    ]);
    
    setSystemMetrics((systemData as any).data);
    // Set other dashboard data as needed
  };

  const fetchMetrics = async () => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '50',
      sortBy,
      sortOrder,
      ...filters
    });
    
    const response = await SecureAPI.get(`/performance/metrics?${params}`);
    setMetrics((response as any).data.metrics);
    setTotalPages((response as any).data.totalPages);
  };

  const fetchOptimizations = async () => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '50',
      sortBy,
      sortOrder,
      ...filters
    });
    
    const response = await SecureAPI.get(`/performance/optimizations?${params}`);
    setOptimizations((response as any).data.optimizations);
    setTotalPages((response as any).data.totalPages);
  };

  const fetchConfigs = async () => {
    const response = await SecureAPI.get('/performance/configs');
    setConfigs((response as any).data);
  };

  // Manual optimization triggers
  const triggerOptimization = async (action: string) => {
    try {
      setLoading(true);
      await SecureAPI.post(`/performance/optimize/${action}`);
      await fetchOptimizations();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Optimizasyon başlatılırken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchData, 30000); // 30 seconds
      setRefreshInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh]);

  useEffect(() => {
    fetchData();
  }, [activeTab, page, sortBy, sortOrder]);

  useEffect(() => {
    if (showFilters) {
      fetchData();
    }
  }, [filters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'green';
      case 'warning': return 'yellow';
      case 'critical': return 'red';
      case 'optimized': return 'blue';
      default: return 'gray';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'low': return 'green';
      case 'medium': return 'yellow';
      case 'high': return 'red';
      default: return 'gray';
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('tr-TR');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderDashboard = () => (
    <div className="performance-dashboard">
      <div className="dashboard-header">
        <h2>Performans Dashboard</h2>
        <div className="dashboard-controls">
          <button
            className={`refresh-btn ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={autoRefresh ? 'spinning' : ''} />
            {autoRefresh ? 'Otomatik Yenileme Açık' : 'Otomatik Yenileme'}
          </button>
          <button className="refresh-btn" onClick={fetchData}>
            <RefreshCw />
            Yenile
          </button>
        </div>
      </div>

      {systemMetrics && (
        <div className="system-metrics">
          <motion.div className="metric-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="metric-header">
              <MemoryStick className="metric-icon" />
              <h3>Bellek Kullanımı</h3>
            </div>
            <div className="metric-content">
              <div className="metric-value">
                <span className="value">{systemMetrics.memory.heapUsed}</span>
                <span className="unit">MB</span>
              </div>
              <div className="metric-details">
                <div>RSS: {systemMetrics.memory.rss} MB</div>
                <div>Toplam: {systemMetrics.memory.heapTotal} MB</div>
                <div>External: {systemMetrics.memory.external} MB</div>
              </div>
            </div>
          </motion.div>

          <motion.div className="metric-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="metric-header">
              <Cpu className="metric-icon" />
              <h3>CPU Kullanımı</h3>
            </div>
            <div className="metric-content">
              <div className="metric-value">
                <span className="value">{(systemMetrics.cpu.user / 1000000).toFixed(2)}</span>
                <span className="unit">s</span>
              </div>
              <div className="metric-details">
                <div>User: {(systemMetrics.cpu.user / 1000000).toFixed(2)}s</div>
                <div>System: {(systemMetrics.cpu.system / 1000000).toFixed(2)}s</div>
              </div>
            </div>
          </motion.div>

          <motion.div className="metric-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="metric-header">
              <HardDrive className="metric-icon" />
              <h3>Disk Kullanımı</h3>
            </div>
            <div className="metric-content">
              <div className="metric-value">
                <span className="value">{systemMetrics.disk.usagePercent}</span>
                <span className="unit">kullanım</span>
              </div>
              <div className="metric-details">
                <div>Toplam: {systemMetrics.disk.total}</div>
                <div>Kullanılan: {systemMetrics.disk.used}</div>
                <div>Boş: {systemMetrics.disk.available}</div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="optimization-controls">
        <h3>Hızlı Optimizasyonlar</h3>
        <div className="control-buttons">
          <button
            className="optimize-btn cache"
            onClick={() => triggerOptimization('cache')}
            disabled={loading}
          >
            <Zap />
            Önbellek Temizle
          </button>
          <button
            className="optimize-btn database"
            onClick={() => triggerOptimization('database')}
            disabled={loading}
          >
            <Database />
            Veritabanı Optimize Et
          </button>
          <button
            className="optimize-btn memory"
            onClick={() => triggerOptimization('memory')}
            disabled={loading}
          >
            <MemoryStick />
            Bellek Temizle
          </button>
        </div>
      </div>
    </div>
  );

  const renderMetrics = () => (
    <div className="metrics-section">
      <div className="section-header">
        <h2>Performans Metrikleri</h2>
        <div className="header-controls">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Metrik ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit">
              <Search />
            </button>
          </form>
          <button
            className="filter-btn"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter />
            Filtreler
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="filters-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="filter-row">
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">Tüm Tipler</option>
                <option value="api">API</option>
                <option value="database">Veritabanı</option>
                <option value="frontend">Frontend</option>
                <option value="system">Sistem</option>
                <option value="cache">Önbellek</option>
                <option value="memory">Bellek</option>
                <option value="cpu">CPU</option>
                <option value="network">Ağ</option>
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Tüm Durumlar</option>
                <option value="normal">Normal</option>
                <option value="warning">Uyarı</option>
                <option value="critical">Kritik</option>
                <option value="optimized">Optimize</option>
              </select>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                placeholder="Başlangıç tarihi"
              />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                placeholder="Bitiş tarihi"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="metrics-list">
        {metrics.map((metric) => (
          <motion.div
            key={metric.id}
            className={`metric-item ${metric.status}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="metric-info">
              <div className="metric-name">{metric.metric}</div>
              <div className="metric-type">{metric.type} - {metric.category}</div>
              <div className="metric-timestamp">{formatDate(metric.context.timestamp)}</div>
            </div>
            <div className="metric-value">
              <span className="value">{metric.value}</span>
              <span className="unit">{metric.unit}</span>
            </div>
            <div className={`metric-status ${metric.status}`}>
              <span className={`status-dot ${getStatusColor(metric.status)}`}></span>
              {metric.status}
            </div>
          </motion.div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Önceki
          </button>
          <span>{page} / {totalPages}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Sonraki
          </button>
        </div>
      )}
    </div>
  );

  const renderOptimizations = () => (
    <div className="optimizations-section">
      <div className="section-header">
        <h2>Optimizasyon Geçmişi</h2>
        <button
          className="create-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus />
          Yeni Optimizasyon
        </button>
      </div>

      <div className="optimizations-list">
        {optimizations.map((optimization) => (
          <motion.div
            key={optimization.id}
            className={`optimization-item ${optimization.status}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="optimization-header">
              <div className="optimization-action">{optimization.action}</div>
              <div className={`optimization-status ${optimization.status}`}>
                {optimization.status === 'completed' && <CheckCircle />}
                {optimization.status === 'running' && <RefreshCw className="spinning" />}
                {optimization.status === 'failed' && <AlertTriangle />}
                {optimization.status === 'pending' && <Clock />}
                {optimization.status}
              </div>
            </div>
            <div className="optimization-details">
              <div className="optimization-description">{optimization.description}</div>
              <div className="optimization-meta">
                <span className="optimization-type">{optimization.type}</span>
                <span className={`optimization-impact ${optimization.impact}`}>
                  {optimization.impact} etki
                </span>
                <span className="optimization-executor">{optimization.executedBy}</span>
                <span className="optimization-time">{formatDate(optimization.executedAt)}</span>
              </div>
            </div>
            {optimization.status === 'completed' && optimization.results && (
              <div className="optimization-results">
                <div className="improvement">
                  <TrendingUp />
                  {optimization.results.improvement.toFixed(2)}% iyileştirme
                </div>
                <div className="duration">
                  {optimization.results.duration}ms sürdü
                </div>
              </div>
            )}
            {optimization.status === 'failed' && optimization.error && (
              <div className="optimization-error">
                <AlertTriangle />
                {optimization.error}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderConfigs = () => (
    <div className="configs-section">
      <div className="section-header">
        <h2>Performans Konfigürasyonları</h2>
        <button
          className="create-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus />
          Yeni Konfigürasyon
        </button>
      </div>

      <div className="configs-list">
        {configs.map((config) => (
          <motion.div
            key={config.id}
            className="config-item"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="config-header">
              <div className="config-name">{config.name}</div>
              <div className="config-controls">
                <button className="config-btn edit">
                  <Edit />
                </button>
                <button className="config-btn delete">
                  <Trash2 />
                </button>
              </div>
            </div>
            <div className="config-description">{config.description}</div>
            <div className="config-meta">
              <span className={`config-category ${config.category}`}>{config.category}</span>
              <span className={`config-status ${config.isEnabled ? 'enabled' : 'disabled'}`}>
                {config.isEnabled ? 'Aktif' : 'Pasif'}
              </span>
              <span className="config-priority">Öncelik: {config.priority}</span>
            </div>
            {config.schedule && (
              <div className="config-schedule">
                <Clock />
                {config.schedule.type}: {config.schedule.value}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );

  const breadcrumb = [
    { label: 'Ana Sayfa', path: '/' },
    { label: 'Performans Optimizasyonu' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Performans Optimizasyonu"
      breadcrumb={breadcrumb}
    >
      <div className="performance-page">
        <div className="page-description">
          <p>Sistem performansını izle ve optimize et</p>
        </div>

        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Activity />
            Dashboard
          </button>
          <button
            className={`tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
            onClick={() => setActiveTab('metrics')}
          >
            <BarChart3 />
            Metrikler
          </button>
          <button
            className={`tab-btn ${activeTab === 'optimizations' ? 'active' : ''}`}
            onClick={() => setActiveTab('optimizations')}
          >
            <Zap />
            Optimizasyonlar
          </button>
          <button
            className={`tab-btn ${activeTab === 'configs' ? 'active' : ''}`}
            onClick={() => setActiveTab('configs')}
          >
            <Settings />
            Konfigürasyonlar
          </button>
        </div>

      {error && (
        <motion.div
          className="error-message"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertTriangle />
          {error}
        </motion.div>
      )}

      {loading && (
        <div className="loading-spinner">
          <RefreshCw className="spinning" />
          Yükleniyor...
        </div>
      )}

      <div className="page-content">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'metrics' && renderMetrics()}
        {activeTab === 'optimizations' && renderOptimizations()}
        {activeTab === 'configs' && renderConfigs()}
        </div>
      </div>
    </ModernDashboardLayout>
  );
};

export default PerformancePage;
