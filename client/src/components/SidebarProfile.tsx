import { Portrait } from './Portrait';

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
  pansiyon?: boolean | undefined;
  photoSrc?: string | undefined;
}

/**
 * Devlet kullanıcı kartı — vesikalık + sicil no + ad + rol/pansiyon
 * çipleri. Mockup'taki KAYITLI satırı + adSoyad bloğunun bileşeni.
 */
export function SidebarProfile({ name, userId, role, pansiyon, photoSrc }: SidebarProfileProps) {
  const roleLabel = ROLE_LABELS[role] ?? role;
  return (
    <div className="p-4 border-b border-white/10 flex gap-3">
      <Portrait name={name} src={photoSrc} size="md" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-white/50">Sicil</div>
        <div className="font-mono text-xs text-white/70 truncate">{userId}</div>
        <div className="mt-1.5 font-serif text-sm text-white leading-snug truncate">{name}</div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-white/10 text-white border border-white/15">
            {roleLabel}
          </span>
          {pansiyon && (
            <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70 border border-white/15">
              Pansiyon
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
