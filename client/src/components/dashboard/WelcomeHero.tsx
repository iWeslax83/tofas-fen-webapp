import { Card } from '../ui/Card';

export interface WelcomeHeroProps {
  adSoyad: string;
  /** Optional one-line summary under the greeting. Defaults to today's date. */
  subtitle?: string;
}

const formatDateTr = (d = new Date()): string =>
  d.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/**
 * Dashboard karşılama başlığı — kırmızı accent şeritli sade selamlama.
 * Eski "Resmi Bildirim" mektubunun yerini alır.
 */
export function WelcomeHero({ adSoyad, subtitle }: WelcomeHeroProps) {
  return (
    <Card accentBar contentClassName="p-6">
      <p className="font-serif text-2xl text-[var(--ink)] leading-tight">
        Merhaba, <span className="font-semibold">{adSoyad}</span>
      </p>
      <p className="mt-1 text-sm text-[var(--ink-dim)]">{subtitle ?? formatDateTr()}</p>
    </Card>
  );
}
