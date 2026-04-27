import { Chip } from '../ui/Chip';

export interface KpiItem {
  label: string;
  value: string;
  /** Optional outline chip rendered next to the value (delta, status). */
  badge?: string;
}

export interface KpiTableProps {
  items: KpiItem[];
}

/**
 * TABLO I — KPI grid. Mono uppercase labels, big serif numbers,
 * outline chips for deltas. Items the parent doesn't pass aren't
 * rendered, so an empty `items` array means the table is hidden.
 */
export function KpiTable({ items }: KpiTableProps) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)] mb-2">
        Tablo I — Anahtar Göstergeler
      </h2>
      <div
        className="grid border border-[var(--rule)] divide-x divide-[var(--rule)]"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => (
          <div key={item.label} className="p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
              {item.label}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-serif text-3xl text-[var(--ink)] leading-none">
                {item.value}
              </span>
              {item.badge && <Chip tone="outline">{item.badge}</Chip>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
