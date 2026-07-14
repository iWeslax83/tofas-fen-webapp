import { Link } from 'react-router-dom';
import { BookOpen, ClipboardList, FileText, Megaphone, UserPlus } from 'lucide-react';

export type ActivityKind = 'note' | 'homework' | 'announcement' | 'dilekce' | 'registration';

export interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  /** ISO timestamp from the server. */
  date: string;
  url: string;
}

export interface RecentActivityProps {
  entries: ActivityEntry[];
}

const ICONS: Record<ActivityKind, typeof BookOpen> = {
  note: BookOpen,
  homework: ClipboardList,
  announcement: Megaphone,
  dilekce: FileText,
  registration: UserPlus,
};

/** "3 saat önce" — falls back to a plain date once it stops being useful. */
export function relativeTime(iso: string, now = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';

  const minutes = Math.round((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return 'az önce';
  if (minutes < 60) return `${minutes} dakika önce`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days} gün önce`;

  return then.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}

/**
 * The dashboard's activity feed: what actually happened to this user
 * lately, newest first. Replaces the old shortcut list, which duplicated
 * the sidebar and the command palette without telling anyone anything.
 */
export function RecentActivity({ entries }: RecentActivityProps) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-[var(--ink-2)] mb-3">Son Hareketler</h2>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-[var(--rule)] px-4 py-6 text-center">
          <p className="font-serif text-sm text-[var(--ink-2)]">Henüz bir hareket yok.</p>
        </div>
      ) : (
        <ul className="rounded-lg border border-[var(--rule)] divide-y divide-[var(--rule)] overflow-hidden">
          {entries.map((entry) => {
            const Icon = ICONS[entry.kind];
            return (
              <li key={entry.id}>
                <Link
                  to={entry.url}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors"
                >
                  <Icon size={16} className="text-[var(--ink-dim)] shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block font-serif text-sm text-[var(--ink)] truncate">
                      {entry.title}
                    </span>
                    <span className="block text-xs text-[var(--ink-dim)] truncate">
                      {entry.detail}
                    </span>
                  </span>
                  <time
                    dateTime={entry.date}
                    className="text-xs text-[var(--ink-dim)] shrink-0 whitespace-nowrap"
                  >
                    {relativeTime(entry.date)}
                  </time>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
