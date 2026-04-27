import { Card } from '../ui/Card';

export interface AnnouncementCardProps {
  title: string;
  body: string;
  fileNo?: string;
  date?: string;
}

/**
 * Devlet duyuru kartı — kırmızı başlık bandı + dosya no.
 */
export function AnnouncementCard({ title, body, fileNo, date }: AnnouncementCardProps) {
  return (
    <Card>
      <div className="bg-[var(--state)] text-white px-4 py-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em]">Duyuru</span>
        {fileNo && (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-80">
            Dosya No: {fileNo}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-serif text-base text-[var(--ink)]">{title}</h3>
        {date && (
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
            {date}
          </div>
        )}
        <p className="mt-3 font-serif text-sm text-[var(--ink-2)] leading-relaxed">{body}</p>
      </div>
    </Card>
  );
}
