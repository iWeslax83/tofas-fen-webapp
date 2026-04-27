import { Card } from '../ui/Card';

export interface OfficialNoticeHeroProps {
  adSoyad: string;
  /** Belge numarası — backend'den gelmiyorsa today'in tarihiyle üretilir. */
  noticeNo?: string;
  /** Hero gövdesi. Override edilmezse role-aware bir cümle çıkar. */
  body?: string;
}

const todayNoticeNo = (): string => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}/${mm}${dd}`;
};

const formatDateTr = (d = new Date()): string =>
  d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Devlet hero — ministerial-style "official notice" header.
 * Replaces the legacy "Hoş Geldiniz" banner.
 */
export function OfficialNoticeHero({ adSoyad, noticeNo, body }: OfficialNoticeHeroProps) {
  const code = noticeNo ?? todayNoticeNo();
  const defaultBody = `${formatDateTr()} tarihli akademik kayıtlarınız işlenmiştir. Detaylar aşağıdaki tablolardadır.`;
  return (
    <Card accentBar contentClassName="p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
        Resmi Bildirim · No. {code}
      </div>
      <p className="mt-3 font-serif text-lg text-[var(--ink)] leading-snug">
        Sayın <span className="font-semibold">{adSoyad}</span>,
      </p>
      <p className="mt-2 font-serif text-sm text-[var(--ink-2)] leading-relaxed">
        {body ?? defaultBody}
      </p>
    </Card>
  );
}
