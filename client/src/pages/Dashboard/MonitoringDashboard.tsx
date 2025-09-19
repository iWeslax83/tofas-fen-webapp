import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  Server,
  Database,
  // Users, // Not used
  // FileText, // Not used
  // Calendar, // Not used
  Settings
} from 'lucide-react';
import { MonitoringService } from '../../utils/apiService';

interface MonitoringData {
  health: {
    status: string;
    timestamp: string;
    uptime: number;
    checks: {
      database: boolean;
      redis: boolean;
      memory: boolean;
    };
  };
  metrics: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    activeConnections: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    free: number;
  };
  cpu: {
    usage: number;
    loadAverage: number;
    cores: number;
  };
  uptime: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
  warnings: string[];
}

export default function MonitoringDashboard() {
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [healthRes, metricsRes, memoryRes, cpuRes, uptimeRes, warningsRes] = await Promise.all([
        MonitoringService.getHealth(),
        MonitoringService.getMetrics(),
        MonitoringService.getMemory(),
        MonitoringService.getCPU(),
        MonitoringService.getUptime(),
        MonitoringService.getWarnings()
      ]);

      const data: MonitoringData = {
        health: healthRes.data as MonitoringData['health'],
        metrics: metricsRes.data as MonitoringData['metrics'],
        memory: memoryRes.data as MonitoringData['memory'],
        cpu: cpuRes.data as MonitoringData['cpu'],
        uptime: uptimeRes.data as MonitoringData['uptime'],
        warnings: warningsRes.data as MonitoringData['warnings']
      };

      setMonitoringData(data);
    } catch (err) {
      console.error('Error fetching monitoring data:', err);
      setError('Monitoring verileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchMonitoringData, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${days}g ${hours}s ${minutes}d ${secs}s`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading && !monitoringData) {
    return (
            <div className="monitoring-page-bg">
        <div className="monitoring-container">
          <div className="monitoring-animate-pulse">
            <div className="monitoring-loading-title monitoring-mb-6"></div>
            <div className="monitoring-loading-grid">
                              {[...Array(6)].map((_, i) => (
                  <div key={i} className="monitoring-loading-item"></div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="monitoring-page-bg">
        <div className="monitoring-container">
          <div className="monitoring-error-bg">
            <AlertTriangle className="monitoring-error-icon" />
            <h2 className="monitoring-error-title">Hata</h2>
            <p className="monitoring-error-message">{error}</p>
            <button
              onClick={fetchMonitoringData}
              className="monitoring-error-button"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="monitoring-page-bg">
      <div className="monitoring-container">
        {/* Header */}
        <div className="monitoring-flex-between-center monitoring-mb-8">
          <div>
            <h1 className="monitoring-page-title">Sistem Monitörü</h1>
            <p className="monitoring-page-subtitle">Gerçek zamanlı sistem durumu ve performans metrikleri</p>
          </div>
          <div className="monitoring-header-gap">
            <label className="monitoring-label-gap">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="monitoring-checkbox"
              />
              <span className="monitoring-auto-refresh-text">Otomatik yenile</span>
            </label>
            <button
              onClick={fetchMonitoringData}
              className="monitoring-refresh-button"
            >
              <Activity className="icon-small" />
              Yenile
            </button>
          </div>
        </div>

        {/* Status Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="monitoring-status-grid"
        >
          {/* System Health */}
          <div className="monitoring-card">
            <div className="monitoring-flex-center-between">
              <div>
                <p className="monitoring-status-label">Sistem Durumu</p>
                <p className={`monitoring-status-value ${
                  monitoringData?.health.status === 'healthy' ? 'monitoring-text-green' : 'monitoring-text-red'
                }`}>
                  {monitoringData?.health.status === 'healthy' ? 'Sağlıklı' : 'Sorunlu'}
                </p>
              </div>
              <div className={`monitoring-status-icon-bg ${
                monitoringData?.health.status === 'healthy' ? 'monitoring-status-icon-bg-green' : 'monitoring-status-icon-bg-red'
              }`}>
                <Server className={`icon-2xl ${
                  monitoringData?.health.status === 'healthy' ? 'monitoring-text-green' : 'monitoring-text-red'
                }`} />
              </div>
            </div>
          </div>

          {/* Uptime */}
          <div className="monitoring-card">
            <div className="monitoring-flex-center-between">
              <div>
                <p className="monitoring-status-label">Çalışma Süresi</p>
                <p className="monitoring-status-value">
                  {monitoringData?.uptime ? formatUptime(monitoringData.uptime.seconds) : 'N/A'}
                </p>
              </div>
              <div className="monitoring-status-icon-bg monitoring-status-icon-bg-blue">
                <Clock className="icon-2xl monitoring-text-blue" />
              </div>
            </div>
          </div>

          {/* CPU Usage */}
          <div className="monitoring-card">
            <div className="monitoring-flex-center-between">
              <div>
                <p className="monitoring-status-label">CPU Kullanımı</p>
                <p className="monitoring-status-value">
                  {monitoringData?.cpu.usage ? `${monitoringData.cpu.usage.toFixed(1)}%` : 'N/A'}
                </p>
              </div>
              <div className="monitoring-status-icon-bg monitoring-status-icon-bg-purple">
                <Cpu className="icon-2xl monitoring-text-purple" />
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="monitoring-card">
            <div className="monitoring-flex-center-between">
              <div>
                <p className="monitoring-status-label">Bellek Kullanımı</p>
                <p className="monitoring-status-value">
                  {monitoringData?.memory.percentage ? `${monitoringData.memory.percentage.toFixed(1)}%` : 'N/A'}
                </p>
              </div>
              <div className="monitoring-status-icon-bg monitoring-status-icon-bg-orange">
                <HardDrive className="icon-2xl monitoring-text-orange" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Detailed Metrics */}
        <div className="monitoring-metrics-grid">
          {/* Performance Metrics */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="monitoring-card"
          >
            <h3 className="monitoring-section-title monitoring-title-gap">
              <TrendingUp className="icon-xl monitoring-text-blue" />
              Performans Metrikleri
            </h3>
            <div className="monitoring-metrics-list">
                              <div className="monitoring-flex-between-center">
                  <span className="monitoring-metric-label">Toplam İstek</span>
                  <span className="monitoring-metric-value">{monitoringData?.metrics.totalRequests?.toLocaleString() || 'N/A'}</span>
                </div>
                              <div className="monitoring-flex-between-center">
                  <span className="monitoring-metric-label">Ortalama Yanıt Süresi</span>
                  <span className="monitoring-metric-value">{monitoringData?.metrics.averageResponseTime ? `${monitoringData.metrics.averageResponseTime}ms` : 'N/A'}</span>
                </div>
                              <div className="monitoring-flex-between-center">
                  <span className="monitoring-metric-label">Hata Oranı</span>
                  <span className="monitoring-metric-value">{monitoringData?.metrics.errorRate ? `${monitoringData.metrics.errorRate.toFixed(2)}%` : 'N/A'}</span>
                </div>
                              <div className="monitoring-flex-between-center">
                  <span className="monitoring-metric-label">Aktif Bağlantılar</span>
                  <span className="monitoring-metric-value">{monitoringData?.metrics.activeConnections || 'N/A'}</span>
                </div>
            </div>
          </motion.div>

          {/* System Resources */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="monitoring-card"
          >
            <h3 className="monitoring-section-title monitoring-title-gap">
              <Settings className="icon-xl monitoring-text-green" />
              Sistem Kaynakları
            </h3>
            <div className="monitoring-resources-list">
              <div>
                                  <div className="monitoring-flex-between-center monitoring-mb-2">
                    <span className="monitoring-resource-label">Bellek</span>
                    <span className="monitoring-resource-value">
                      {monitoringData?.memory.used ? formatBytes(monitoringData.memory.used) : 'N/A'} / {monitoringData?.memory.total ? formatBytes(monitoringData.memory.total) : 'N/A'}
                    </span>
                  </div>
                <div className="monitoring-progress-bg">
                  <div 
                    className="monitoring-progress-bar-blue"
                    style={{ width: `${monitoringData?.memory.percentage || 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="monitoring-flex-between-center monitoring-mb-2">
                  <span className="monitoring-resource-label">CPU</span>
                  <span className="monitoring-resource-value">
                    {monitoringData?.cpu.cores || 'N/A'} Çekirdek
                  </span>
                </div>
                <div className="monitoring-progress-bg">
                  <div 
                    className="monitoring-progress-bar-purple"
                    style={{ width: `${monitoringData?.cpu.usage || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Health Checks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="monitoring-card monitoring-mb-8"
        >
                    <h3 className="monitoring-section-title monitoring-title-gap">
            <Database className="icon-xl monitoring-text-indigo" />
            Sistem Kontrolleri
          </h3>
          <div className="monitoring-health-grid">
            <div className="monitoring-health-check-bg">
              <div className={`monitoring-health-status-dot ${
                monitoringData?.health.checks.database ? 'monitoring-health-status-dot-success' : 'monitoring-health-status-dot-error'
              }`}></div>
                              <span className="monitoring-health-label">Veritabanı</span>
              <span className={`monitoring-health-status ${
                monitoringData?.health.checks.database ? 'monitoring-health-status-success' : 'monitoring-health-status-error'
              }`}>
                {monitoringData?.health.checks.database ? 'Aktif' : 'Pasif'}
              </span>
            </div>
            <div className="monitoring-health-check-bg">
              <div className={`monitoring-health-status-dot ${
                monitoringData?.health.checks.redis ? 'monitoring-health-status-dot-success' : 'monitoring-health-status-dot-error'
              }`}></div>
                              <span className="monitoring-health-label">Redis</span>
              <span className={`monitoring-health-status ${
                monitoringData?.health.checks.redis ? 'monitoring-health-status-success' : 'monitoring-health-status-error'
              }`}>
                {monitoringData?.health.checks.redis ? 'Aktif' : 'Pasif'}
              </span>
            </div>
            <div className="monitoring-health-check-bg">
              <div className={`monitoring-health-status-dot ${
                monitoringData?.health.checks.memory ? 'monitoring-health-status-dot-success' : 'monitoring-health-status-dot-error'
              }`}></div>
                              <span className="monitoring-health-label">Bellek</span>
              <span className={`monitoring-health-status ${
                monitoringData?.health.checks.memory ? 'monitoring-health-status-success' : 'monitoring-health-status-error'
              }`}>
                {monitoringData?.health.checks.memory ? 'Aktif' : 'Pasif'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Warnings */}
        {monitoringData?.warnings && monitoringData.warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="monitoring-warnings-bg"
          >
            <h3 className="monitoring-warning-title monitoring-title-gap">
              <AlertTriangle className="icon-xl monitoring-text-yellow" />
              Uyarılar
            </h3>
            <div className="monitoring-warnings-list">
              {monitoringData.warnings.map((warning, index) => (
                <div key={index} className="monitoring-warning-item-bg">
                  <AlertTriangle className="icon-small monitoring-text-yellow monitoring-mt-0-5 monitoring-flex-shrink-0" />
                  <span className="monitoring-warning-message">{warning}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Last Updated */}
        <div className="monitoring-footer-text">
          Son güncelleme: {monitoringData?.health.timestamp ? new Date(monitoringData.health.timestamp).toLocaleString('tr-TR') : 'N/A'}
        </div>
      </div>
    </div>
  );
}
