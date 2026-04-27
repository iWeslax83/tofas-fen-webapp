import { Portrait } from './Portrait';
import { Chip } from './ui/Chip';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Yönetici',
  teacher: 'Öğretmen',
  student: 'Öğrenci',
  parent: 'Veli',
  hizmetli: 'Hizmetli',
  ziyaretci: 'Ziyaretçi',
};

export interface SidebarProfileProps {
  name: string;
  userId: string;
  role: string;
  pansiyon?: boolean;
  photoSrc?: string;
}

/**
 * Devlet kullanıcı kartı — vesikalık + sicil no + ad + rol/pansiyon
 * çipleri. Mockup'taki KAYITLI satırı + adSoyad bloğunun bileşeni.
 */
export function SidebarProfile({ name, userId, role, pansiyon, photoSrc }: SidebarProfileProps) {
  const roleLabel = ROLE_LABELS[role] ?? role;
  return (
    <div className="p-4 border-b border-[var(--rule)] flex gap-3">
      <Portrait name={name} src={photoSrc} size="md" />
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          Sicil
        </div>
        <div className="font-mono text-xs text-[var(--ink-2)] truncate">{userId}</div>
        <div className="mt-1.5 font-serif text-sm text-[var(--ink)] leading-snug truncate">
          {name}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <Chip tone="black">{roleLabel}</Chip>
          {pansiyon && <Chip tone="outline">Pansiyon</Chip>}
        </div>
      </div>
    </div>
  );
}
