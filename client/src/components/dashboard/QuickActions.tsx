export interface QuickAction {
  key: string;
  shortcut: string;
  label: string;
  onSelect: () => void;
}

export interface QuickActionsProps {
  actions: QuickAction[];
}

/**
 * Devlet hızlı aksiyon listesi — her satır `<kbd>` shortcut'u + etiket.
 */
export function QuickActions({ actions }: QuickActionsProps) {
  if (actions.length === 0) return null;
  return (
    <section>
      <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)] mb-2">
        Hızlı İşlem
      </h2>
      <ul className="border border-[var(--rule)] divide-y divide-[var(--rule)]">
        {actions.map((a) => (
          <li key={a.key}>
            <button
              type="button"
              onClick={a.onSelect}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--surface-2)] transition-colors"
            >
              <kbd className="font-mono text-[10px] uppercase tracking-wider border border-[var(--rule)] px-1.5 py-0.5 text-[var(--ink-dim)] min-w-[2rem] text-center">
                {a.shortcut}
              </kbd>
              <span className="font-serif text-sm text-[var(--ink)]">{a.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
