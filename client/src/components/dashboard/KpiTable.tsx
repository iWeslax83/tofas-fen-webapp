import type { LucideIcon } from 'lucide-react';
import { Chip } from '../ui/Chip';

export type KpiTone = 'accent' | 'ok' | 'warn' | 'info';

const TILE_CLASSES: Record<KpiTone, string> = {
  accent: 'bg-[var(--accent-tint)] text-[var(--accent)]',
  ok: 'bg-[var(--ok-tint)] text-[var(--ok)]',
  warn: 'bg-[var(--warn-tint)] text-[var(--warn)]',
  info: 'bg-[var(--info-tint)] text-[var(--info)]',
};

export interface KpiItem {
  label: string;
  value: string;
  /** Optional outline chip rendered next to the value (delta, status). */
  badge?: string | undefined;
  /** Optional series — renders a hairline sparkline under the value. */
  trend?: number[] | undefined;
  /** Icon tile shown left of the label/value (mockup's .stat-ico). */
  icon?: LucideIcon | undefined;
  /** Icon tile + accent color. Defaults to 'accent'. */
  tone?: KpiTone | undefined;
}

/** Minimal dependency-free sparkline in the Devlet hairline style. */
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const w = 96;
  const h = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="mt-2 block overflow-visible"
      aria-hidden="true"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface KpiTableProps {
  items: KpiItem[];
}

/**
 * Genel bakış KPI grid — big serif numbers, outline chips for deltas.
 * Items the parent doesn't pass aren't rendered, so an empty `items`
 * array means the grid is hidden.
 */
export function KpiTable({ items }: KpiTableProps) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-semibold text-[var(--ink-2)] mb-3">Genel Bakış</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {items.map((item) => {
          const Icon = item.icon;
          const tone = item.tone ?? 'accent';
          return (
            <div
              key={item.label}
              className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--surface)] shadow-[var(--shadow)] p-4"
            >
              {Icon && (
                <div
                  className={`shrink-0 w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center ${TILE_CLASSES[tone]}`}
                >
                  <Icon size={17} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[var(--ink-dim)] tracking-wide">
                  {item.label}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-serif text-2xl text-[var(--ink)] leading-none [font-variant-numeric:tabular-nums]">
                    {item.value}
                  </span>
                  {item.badge && <Chip tone="outline">{item.badge}</Chip>}
                </div>
                {item.trend && item.trend.length >= 2 && <Sparkline data={item.trend} />}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
