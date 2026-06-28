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
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EvciService } from '../../utils/apiService';
import { cn } from '../../utils/cn';
import { toast } from 'sonner';
import { safeConsoleError } from '../../utils/safeLogger';

interface EvciStats {
  summary: { total: number; going: number; notGoing: number };
  weekly: { weekOf: string; total: number; going: number; notGoing: number }[];
  classDistribution: { className: string; count: number }[];
  parentApproval: { approved: number; rejected: number; pending: number };
}

/** Devlet paletinden grafik renkleri — tema değişince CSS değişkenlerinden okunur. */
interface ChartColors {
  ink: string;
  inkDim: string;
  rule: string;
  state: string;
  ok: string;
  warn: string;
  bars: string[];
}

function readChartColors(): ChartColors {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;
  const ink = v('--ink', '#0d0d0d');
  const inkDim = v('--ink-dim', '#555555');
  const rule = v('--rule', '#c9c6bc');
  const state = v('--state', '#931a1a');
  const ok = v('--ok', '#1a6b2f');
  const warn = v('--warn', '#7a5500');
  return { ink, inkDim, rule, state, ok, warn, bars: [ink, state, ok, warn, inkDim] };
}

function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(readChartColors);
  useEffect(() => {
    const observer = new MutationObserver(() => setColors(readChartColors()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);
  return colors;
}

const selectClasses = cn(
  'h-9 bg-transparent border border-[var(--rule)] px-2 text-xs uppercase tracking-wider',
  'text-[var(--ink)] focus:outline-none focus:border-[var(--state)]',
  'transition-colors',
);

function SummaryCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-[var(--paper)] p-4 flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center border border-[var(--rule)] text-[var(--ink-dim)]">
        <Icon size={20} />
      </div>
      <div className="flex flex-col">
        <span className="font-serif text-2xl text-[var(--ink)] leading-none">{value}</span>
        <span className="text-xs font-medium text-[var(--ink-dim)] mt-1">{label}</span>
      </div>
    </div>
  );
}

function ChartCard({
  icon: Icon,
  title,
  className,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card contentClassName="p-0" className={className}>
      <div className="px-4 py-2 border-b border-[var(--rule)] flex items-center gap-2">
        <Icon size={12} className="text-[var(--ink-dim)]" />
        <span className="text-xs font-medium text-[var(--ink-dim)]">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}

export default function EvciStatsPage() {
  const { user: authUser } = useAuthGuard(['admin', 'teacher']);
  const [stats, setStats] = useState<EvciStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weeks, setWeeks] = useState(8);
  const colors = useChartColors();

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

  const tooltipStyle = {
    backgroundColor: 'var(--paper)',
    border: '1px solid var(--rule)',
    borderRadius: 0,
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--ink)',
  } as const;

  if (isLoading) {
    return (
      <ModernDashboardLayout pageTitle="Evci İstatistikleri" breadcrumb={breadcrumb}>
        <div className="p-6 text-xs font-medium text-[var(--ink-dim)]">
          İstatistikler yükleniyor…
        </div>
      </ModernDashboardLayout>
    );
  }

  if (!stats) {
    return (
      <ModernDashboardLayout pageTitle="Evci İstatistikleri" breadcrumb={breadcrumb}>
        <div className="p-6">
          <Card contentClassName="p-10 flex flex-col items-center gap-3 text-center">
            <BarChart3 size={48} className="text-[var(--ink-dim)]" />
            <h3 className="font-serif text-lg text-[var(--ink)]">Veri bulunamadı</h3>
            <p className="font-serif text-sm text-[var(--ink-dim)]">
              Henüz istatistik oluşturacak yeterli veri yok.
            </p>
          </Card>
        </div>
      </ModernDashboardLayout>
    );
  }

  const pieData = [
    { name: 'Gidecek', value: stats.summary.going, fill: colors.ok },
    { name: 'Gitmeyecek', value: stats.summary.notGoing, fill: colors.state },
  ].filter((d) => d.value > 0);

  const approvalPieData = [
    { name: 'Onaylanan', value: stats.parentApproval.approved, fill: colors.ok },
    { name: 'Reddedilen', value: stats.parentApproval.rejected, fill: colors.state },
    { name: 'Bekleyen', value: stats.parentApproval.pending, fill: colors.warn },
  ].filter((d) => d.value > 0);

  return (
    <ModernDashboardLayout pageTitle="Evci İstatistikleri" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Evci İstatistikleri</h1>
            <p className="font-serif text-sm text-[var(--ink-2)] mt-1">
              Evci taleplerinin haftalık dağılımı ve veli onay durumu.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
              className={selectClasses}
              aria-label="Hafta aralığı"
            >
              <option value={4}>Son 4 Hafta</option>
              <option value={8}>Son 8 Hafta</option>
              <option value={12}>Son 12 Hafta</option>
            </select>
            <Link to={`/${authUser?.rol || 'admin'}/evci-listesi`}>
              <Button variant="secondary" size="sm">
                <ArrowLeft size={14} />
                Talep Listesi
              </Button>
            </Link>
          </div>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--rule)] border border-[var(--rule)]">
          <SummaryCard icon={Users} value={stats.summary.total} label="Toplam Talep" />
          <SummaryCard icon={Home} value={stats.summary.going} label="Gidecek" />
          <SummaryCard icon={Home} value={stats.summary.notGoing} label="Gitmeyecek" />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard icon={PieChartIcon} title="Gidecek / Gitmeyecek">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  stroke="var(--paper)"
                  label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard icon={PieChartIcon} title="Veli Onay Durumu">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={approvalPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  stroke="var(--paper)"
                  label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                >
                  {approvalPieData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard icon={BarChart3} title="Sınıf Dağılımı">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.classDistribution.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.rule} />
                <XAxis dataKey="className" fontSize={12} stroke={colors.inkDim} />
                <YAxis stroke={colors.inkDim} fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: colors.rule, opacity: 0.3 }} />
                <Bar dataKey="count" name="Talep Sayısı">
                  {stats.classDistribution.slice(0, 10).map((_entry, index) => (
                    <Cell key={index} fill={colors.bars[index % colors.bars.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard icon={TrendingUp} title="Haftalık Trend" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats.weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.rule} />
                <XAxis dataKey="weekOf" fontSize={11} stroke={colors.inkDim} />
                <YAxis stroke={colors.inkDim} fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontFamily: 'var(--font-mono)', fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="going"
                  name="Gidecek"
                  stroke={colors.ok}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="notGoing"
                  name="Gitmeyecek"
                  stroke={colors.state}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Toplam"
                  stroke={colors.ink}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </ModernDashboardLayout>
  );
}
