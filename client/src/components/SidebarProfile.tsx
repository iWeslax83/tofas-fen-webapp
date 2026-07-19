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
 * Kenar çubuğu alt bilgi bloğu — vesikalık + okul no + ad + rol/pansiyon çipleri.
 */
export function SidebarProfile({ name, userId, role, pansiyon, photoSrc }: SidebarProfileProps) {
  const roleLabel = ROLE_LABELS[role] ?? role;
  return (
    <div className="p-3 mt-auto border-t border-rule flex gap-3">
      <Portrait name={name} src={photoSrc} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-ink-dim truncate">{userId}</div>
        <div className="mt-1 font-serif text-sm text-ink leading-snug truncate">{name}</div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-surface-2 text-ink-2 border border-rule">
            {roleLabel}
          </span>
          {pansiyon && (
            <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-dim border border-rule">
              Pansiyon
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
