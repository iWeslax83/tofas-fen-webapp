import { Chip } from '../ui/Chip';

export interface KpiItem {
  label: string;
  value: string;
  /** Optional outline chip rendered next to the value (delta, status). */
  badge?: string | undefined;
  /** Optional series — renders a hairline sparkline under the value. */
  trend?: number[] | undefined;
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
        stroke="var(--state)"
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
      <div
        className="grid rounded-lg border border-[var(--rule)] divide-x divide-[var(--rule)] overflow-hidden"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => (
          <div key={item.label} className="p-4">
            <div className="text-xs text-[var(--ink-dim)]">{item.label}</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-serif text-3xl text-[var(--ink)] leading-none">
                {item.value}
              </span>
              {item.badge && <Chip tone="outline">{item.badge}</Chip>}
            </div>
            {item.trend && item.trend.length >= 2 && <Sparkline data={item.trend} />}
          </div>
        ))}
      </div>
    </section>
  );
}
