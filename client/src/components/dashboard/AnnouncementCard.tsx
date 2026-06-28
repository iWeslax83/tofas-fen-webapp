import { Card } from '../ui/Card';

export interface AnnouncementCardProps {
  title: string;
  body: string;
  date?: string;
}

/**
 * Duyuru kartı — kırmızı başlık bandı, başlık, tarih ve gövde.
 */
export function AnnouncementCard({ title, body, date }: AnnouncementCardProps) {
  return (
    <Card>
      <div className="bg-[var(--state)] text-white px-4 py-2">
        <span className="text-xs font-semibold tracking-wide">Duyuru</span>
      </div>
      <div className="p-4">
        <h3 className="font-serif text-base text-[var(--ink)]">{title}</h3>
        {date && <div className="mt-1 text-xs text-[var(--ink-dim)]">{date}</div>}
        <p className="mt-3 font-serif text-sm text-[var(--ink-2)] leading-relaxed">{body}</p>
      </div>
    </Card>
  );
}
