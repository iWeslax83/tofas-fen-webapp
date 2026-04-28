import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Trash2,
  Plus,
  Search,
  Filter,
  Edit,
} from 'lucide-react';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip, type ChipProps } from '../../components/ui/Chip';
import { Input } from '../../components/ui/Input';
import { SecureAPI } from '../../utils/api';
import { cn } from '../../utils/cn';

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
  metadata: Record<string, unknown>;
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
  settings: Record<string, unknown>;
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

type Tab = 'dashboard' | 'metrics' | 'optimizations' | 'configs';

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: Activity },
  { key: 'metrics', label: 'Metrikler', icon: BarChart3 },
  { key: 'optimizations', label: 'Optimizasyon', icon: Zap },
  { key: 'configs', label: 'Konfigürasyon', icon: Settings },
];

const STATUS_TONES: Record<string, ChipProps['tone']> = {
  normal: 'default',
  warning: 'outline',
  critical: 'state',
  optimized: 'black',
  completed: 'black',
  running: 'outline',
  failed: 'state',
  pending: 'default',
};

const formatDate = (date: string | Date) => new Date(date).toLocaleString('tr-TR');

const selectClasses = cn(
  'h-10 bg-transparent border-0 border-b border-[var(--rule)] px-1 text-sm',
  'text-[var(--ink)] focus:outline-none focus:border-[var(--state)] focus:border-b-2',
  'transition-colors',
);

const PerformancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
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
    endDate: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sortBy = 'timestamp';
  const sortOrder: 'asc' | 'desc' = 'desc';

  const fetchDashboard = useCallback(async () => {
    const [, systemData] = await Promise.all([
      SecureAPI.get('/performance/dashboard'),
      SecureAPI.get('/performance/system'),
    ]);
    setSystemMetrics((systemData as { data: SystemMetrics }).data);
  }, []);

  const fetchMetrics = useCallback(async () => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '50',
      sortBy,
      sortOrder,
      ...filters,
    });
    const response = await SecureAPI.get(`/performance/metrics?${params}`);
    const r = response as { data: { metrics: Metric[]; totalPages: number } };
    setMetrics(r.data.metrics);
    setTotalPages(r.data.totalPages);
  }, [filters, page]);

  const fetchOptimizations = useCallback(async () => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '50',
      sortBy,
      sortOrder,
      ...filters,
    });
    const response = await SecureAPI.get(`/performance/optimizations?${params}`);
    const r = response as { data: { optimizations: Optimization[]; totalPages: number } };
    setOptimizations(r.data.optimizations);
    setTotalPages(r.data.totalPages);
  }, [filters, page]);

  const fetchConfigs = useCallback(async () => {
    const response = await SecureAPI.get('/performance/configs');
    setConfigs((response as { data: Config[] }).data);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'dashboard') await fetchDashboard();
      else if (activeTab === 'metrics') await fetchMetrics();
      else if (activeTab === 'optimizations') await fetchOptimizations();
      else if (activeTab === 'configs') await fetchConfigs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Veri yüklenirken hata oluştu';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeTab, fetchDashboard, fetchMetrics, fetchOptimizations, fetchConfigs]);

  const triggerOptimization = async (action: string) => {
    try {
      setLoading(true);
      await SecureAPI.post(`/performance/optimize/${action}`);
      await fetchOptimizations();
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Optimizasyon başlatılırken hata oluştu';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(fetchData, 30000);
    } else if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [autoRefresh, fetchData]);

  useEffect(() => {
    fetchData();
  }, [activeTab, page, fetchData]);

  useEffect(() => {
    if (showFilters) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const breadcrumb = [{ label: 'Ana Sayfa', path: '/admin' }, { label: 'Performans' }];

  return (
    <ModernDashboardLayout pageTitle="Performans Optimizasyonu" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
            Belge No. {new Date().getFullYear()}/P-O
          </div>
          <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Performans Optimizasyonu</h1>
          <p className="font-serif text-sm text-[var(--ink-2)] mt-1">
            Sistem performansını izle ve optimize et.
          </p>
        </header>

        <div className="flex items-center gap-1 flex-wrap border-b border-[var(--rule)] pb-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  'h-9 px-3 text-xs font-mono uppercase tracking-wider border transition-colors flex items-center gap-2',
                  active
                    ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
                    : 'bg-transparent text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]',
                )}
                aria-pressed={active}
              >
                <Icon size={12} />
                {t.label}
              </button>
            );
          })}
        </div>

        {error && (
          <Card contentClassName="px-4 py-3 flex items-center gap-2 border-l-4 border-[var(--state)]">
            <Chip tone="state">Hata</Chip>
            <span className="font-serif text-sm text-[var(--ink)] flex-1">{error}</span>
          </Card>
        )}

        {loading && (
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
            <RefreshCw size={12} className="animate-spin" />
            Yükleniyor…
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardTab
            systemMetrics={systemMetrics}
            autoRefresh={autoRefresh}
            onToggleAutoRefresh={() => setAutoRefresh((v) => !v)}
            onRefresh={fetchData}
            onTriggerOptimization={triggerOptimization}
            loading={loading}
          />
        )}

        {activeTab === 'metrics' && (
          <MetricsTab
            metrics={metrics}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearch={handleSearch}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters((v) => !v)}
            filters={filters}
            onFilterChange={(updates) => setFilters({ ...filters, ...updates })}
          />
        )}

        {activeTab === 'optimizations' && <OptimizationsTab optimizations={optimizations} />}

        {activeTab === 'configs' && <ConfigsTab configs={configs} />}
      </div>
    </ModernDashboardLayout>
  );
};

export default PerformancePage;

interface DashboardTabProps {
  systemMetrics: SystemMetrics | null;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  onRefresh: () => void;
  onTriggerOptimization: (action: string) => void;
  loading: boolean;
}

function DashboardTab({
  systemMetrics,
  autoRefresh,
  onToggleAutoRefresh,
  onRefresh,
  onTriggerOptimization,
  loading,
}: DashboardTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-serif text-lg text-[var(--ink)]">Sistem Durumu</h2>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? 'primary' : 'secondary'}
            size="sm"
            onClick={onToggleAutoRefresh}
          >
            <RefreshCw size={14} className={autoRefresh ? 'animate-spin' : ''} />
            {autoRefresh ? 'Otomatik AÇIK' : 'Otomatik Yenile'}
          </Button>
          <Button variant="secondary" size="sm" onClick={onRefresh}>
            <RefreshCw size={14} />
            Yenile
          </Button>
        </div>
      </div>

      {systemMetrics ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--rule)] border border-[var(--rule)]">
          <SystemCard
            icon={MemoryStick}
            label="Bellek (Heap)"
            value={`${systemMetrics.memory.heapUsed}`}
            unit="MB"
            details={[
              `RSS: ${systemMetrics.memory.rss} MB`,
              `Toplam: ${systemMetrics.memory.heapTotal} MB`,
              `External: ${systemMetrics.memory.external} MB`,
            ]}
          />
          <SystemCard
            icon={Cpu}
            label="CPU"
            value={`${(systemMetrics.cpu.user / 1_000_000).toFixed(2)}`}
            unit="s"
            details={[
              `User: ${(systemMetrics.cpu.user / 1_000_000).toFixed(2)}s`,
              `System: ${(systemMetrics.cpu.system / 1_000_000).toFixed(2)}s`,
            ]}
          />
          <SystemCard
            icon={HardDrive}
            label="Disk"
            value={systemMetrics.disk.usagePercent}
            unit="kullanım"
            details={[
              `Toplam: ${systemMetrics.disk.total}`,
              `Kullanılan: ${systemMetrics.disk.used}`,
              `Boş: ${systemMetrics.disk.available}`,
            ]}
          />
        </div>
      ) : (
        <Card contentClassName="p-6 font-serif text-sm text-[var(--ink-dim)]">
          Sistem verisi henüz yüklenmedi.
        </Card>
      )}

      <Card contentClassName="p-0">
        <div className="px-4 py-2 border-b border-[var(--rule)] flex items-center gap-2">
          <Zap size={12} className="text-[var(--ink-dim)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
            Hızlı Optimizasyonlar
          </span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onTriggerOptimization('cache')}
            disabled={loading}
          >
            <Zap size={14} />
            Önbellek Temizle
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onTriggerOptimization('database')}
            disabled={loading}
          >
            <Database size={14} />
            Veritabanı Optimize Et
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onTriggerOptimization('memory')}
            disabled={loading}
          >
            <MemoryStick size={14} />
            Bellek Temizle
          </Button>
        </div>
      </Card>
    </div>
  );
}

function SystemCard({
  icon: Icon,
  label,
  value,
  unit,
  details,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  unit: string;
  details: string[];
}) {
  return (
    <div className="bg-[var(--paper)] p-4 space-y-2">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
        <Icon size={12} />
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-serif text-3xl text-[var(--ink)]">{value}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
          {unit}
        </span>
      </div>
      <ul className="space-y-0.5">
        {details.map((d) => (
          <li key={d} className="font-mono text-[10px] text-[var(--ink-dim-2)]">
            {d}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface MetricsTabProps {
  metrics: Metric[];
  page: number;
  totalPages: number;
  onPageChange: (n: number) => void;
  searchQuery: string;
  onSearchQueryChange: (s: string) => void;
  onSearch: (e: React.FormEvent) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  filters: { type: string; category: string; status: string; startDate: string; endDate: string };
  onFilterChange: (
    updates: Partial<{
      type: string;
      category: string;
      status: string;
      startDate: string;
      endDate: string;
    }>,
  ) => void;
}

function MetricsTab({
  metrics,
  page,
  totalPages,
  onPageChange,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  showFilters,
  onToggleFilters,
  filters,
  onFilterChange,
}: MetricsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-serif text-lg text-[var(--ink)]">Performans Metrikleri</h2>
        <form onSubmit={onSearch} className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search
              size={12}
              className="absolute left-1 top-1/2 -translate-y-1/2 text-[var(--ink-dim)] pointer-events-none"
            />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Metrik ara…"
              className="pl-5"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            <Search size={14} />
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onToggleFilters}>
            <Filter size={14} />
            Filtreler
          </Button>
        </form>
      </div>

      {showFilters && (
        <Card contentClassName="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={filters.type}
            onChange={(e) => onFilterChange({ type: e.target.value })}
            className={selectClasses}
            aria-label="Tip filtrele"
          >
            <option value="">Tüm Tipler</option>
            {['api', 'database', 'frontend', 'system', 'cache', 'memory', 'cpu', 'network'].map(
              (t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ),
            )}
          </select>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            className={selectClasses}
            aria-label="Durum filtrele"
          >
            <option value="">Tüm Durumlar</option>
            {['normal', 'warning', 'critical', 'optimized'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Input
            type="date"
            value={filters.startDate}
            onChange={(e) => onFilterChange({ startDate: e.target.value })}
            placeholder="Başlangıç"
            aria-label="Başlangıç tarihi"
          />
          <Input
            type="date"
            value={filters.endDate}
            onChange={(e) => onFilterChange({ endDate: e.target.value })}
            placeholder="Bitiş"
            aria-label="Bitiş tarihi"
          />
        </Card>
      )}

      {metrics.length === 0 ? (
        <Card contentClassName="p-10 text-center font-serif text-sm text-[var(--ink-dim)]">
          Metrik bulunamadı.
        </Card>
      ) : (
        <Card contentClassName="p-0">
          <ul className="divide-y divide-[var(--rule)]">
            {metrics.map((m) => (
              <li key={m.id} className="p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-sm text-[var(--ink)]">{m.metric}</div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)] mt-0.5">
                    {m.type} · {m.category}
                  </div>
                  <div className="font-mono text-[10px] text-[var(--ink-dim-2)] mt-0.5">
                    {formatDate(m.context.timestamp)}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-serif text-xl text-[var(--ink)]">{m.value}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                    {m.unit}
                  </span>
                </div>
                <Chip tone={STATUS_TONES[m.status] ?? 'default'}>{m.status}</Chip>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
            Sayfa {page} / {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              Önceki
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function OptimizationsTab({ optimizations }: { optimizations: Optimization[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-serif text-lg text-[var(--ink)]">Optimizasyon Geçmişi</h2>
        <Button variant="primary" size="sm">
          <Plus size={14} />
          Yeni Optimizasyon
        </Button>
      </div>

      {optimizations.length === 0 ? (
        <Card contentClassName="p-10 text-center font-serif text-sm text-[var(--ink-dim)]">
          Optimizasyon kaydı bulunamadı.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {optimizations.map((o) => (
            <Card key={o.id} contentClassName="p-0">
              <div className="px-4 py-2 border-b border-[var(--rule)] flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {o.status === 'completed' && (
                    <CheckCircle size={12} className="text-[var(--ink)]" />
                  )}
                  {o.status === 'running' && (
                    <RefreshCw size={12} className="animate-spin text-[var(--ink-dim)]" />
                  )}
                  {o.status === 'failed' && (
                    <AlertTriangle size={12} className="text-[var(--state)]" />
                  )}
                  {o.status === 'pending' && <Clock size={12} className="text-[var(--ink-dim)]" />}
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                    {o.action}
                  </span>
                </div>
                <Chip tone={STATUS_TONES[o.status] ?? 'default'}>{o.status}</Chip>
              </div>
              <div className="p-4 space-y-2">
                <p className="font-serif text-sm text-[var(--ink)]">{o.description}</p>
                <div className="flex items-center gap-3 flex-wrap font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                  <span>{o.type}</span>
                  <Chip tone="outline">{o.impact} etki</Chip>
                  <span>· {o.executedBy}</span>
                  <span>· {formatDate(o.executedAt)}</span>
                </div>
                {o.status === 'completed' && o.results && (
                  <div className="flex items-center gap-3 pt-2 border-t border-[var(--rule)] font-mono text-[10px] text-[var(--ink-dim)]">
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp size={10} />
                      {o.results.improvement.toFixed(2)}% iyileşme
                    </span>
                    <span>· {o.results.duration}ms</span>
                  </div>
                )}
                {o.status === 'failed' && o.error && (
                  <div className="flex items-start gap-2 pt-2 border-t border-[var(--rule)]">
                    <AlertTriangle size={12} className="text-[var(--state)] mt-0.5 shrink-0" />
                    <span className="font-serif text-sm text-[var(--ink-2)]">{o.error}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfigsTab({ configs }: { configs: Config[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-serif text-lg text-[var(--ink)]">Performans Konfigürasyonları</h2>
        <Button variant="primary" size="sm">
          <Plus size={14} />
          Yeni Konfigürasyon
        </Button>
      </div>

      {configs.length === 0 ? (
        <Card contentClassName="p-10 text-center font-serif text-sm text-[var(--ink-dim)]">
          Konfigürasyon bulunamadı.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {configs.map((c) => (
            <Card key={c.id} contentClassName="p-0">
              <div className="px-4 py-2 border-b border-[var(--rule)] flex items-center justify-between gap-2">
                <span className="font-serif text-base text-[var(--ink)]">{c.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="text-[var(--ink-dim)] hover:text-[var(--ink)] p-1"
                    aria-label="Düzenle"
                    title="Düzenle"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    type="button"
                    className="text-[var(--ink-dim)] hover:text-[var(--state)] p-1"
                    aria-label="Sil"
                    title="Sil"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <p className="font-serif text-sm text-[var(--ink-2)]">{c.description}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Chip tone="outline">{c.category}</Chip>
                  <Chip tone={c.isEnabled ? 'black' : 'default'}>
                    {c.isEnabled ? 'Aktif' : 'Pasif'}
                  </Chip>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                    Öncelik: {c.priority}
                  </span>
                </div>
                {c.schedule && (
                  <div className="flex items-center gap-1 pt-2 border-t border-[var(--rule)] font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                    <Clock size={10} />
                    {c.schedule.type}: {c.schedule.value}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
