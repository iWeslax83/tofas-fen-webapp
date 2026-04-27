import { Command } from 'cmdk';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  dashboardButtons,
  type DashboardButton,
  type UserRole,
} from '../pages/Dashboard/dashboardButtonConfig';
import { cn } from '../utils/cn';

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Active user's role; controls which entries appear. */
  role: UserRole;
  /** Whether the user has pansiyon access; gates dorm-only items. */
  pansiyon?: boolean;
}

/**
 * Devlet command palette — global navigation accelerator.
 *
 * Keyboard:
 *   Cmd/Ctrl+K   open
 *   Esc          close
 *   ↑/↓          move
 *   Enter        select
 *
 * cmdk handles fuzzy matching and ARIA/screen-reader semantics.
 */
export function CommandPalette({ open, onOpenChange, role, pansiyon }: CommandPaletteProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isPaletteShortcut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (!isPaletteShortcut) return;
      e.preventDefault();
      onOpenChange(!open);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  const items: DashboardButton[] = dashboardButtons.filter((btn) => {
    if (!btn.roles.includes(role)) return false;
    if (btn.showForDormitory && !pansiyon) return false;
    return true;
  });

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Komut paleti"
      className={cn(
        'fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]',
        'bg-black/40 backdrop-blur-sm',
      )}
    >
      <div
        className={cn(
          'relative w-full max-w-xl mx-4',
          'bg-[var(--paper)] border border-[var(--rule-2)] shadow-2xl',
        )}
      >
        {/* Devlet kırmızı üst şerit */}
        <div className="h-1 bg-[var(--state)]" aria-hidden="true" />

        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
            Komut Paleti
          </span>
          <kbd className="font-mono text-[10px] text-[var(--ink-dim)] border border-[var(--rule)] px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        <Command.Input
          placeholder="Bir komut veya sayfa yazın…"
          className={cn(
            'w-full px-4 py-3 bg-transparent border-0 border-y border-[var(--rule)]',
            'text-[var(--ink)] placeholder:text-[var(--ink-dim)]',
            'font-serif text-base focus:outline-none',
          )}
        />

        <Command.List className="max-h-[50vh] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center font-serif text-sm text-[var(--ink-dim)]">
            Sonuç bulunamadı.
          </Command.Empty>

          <Command.Group
            heading="Sayfalar"
            className={cn(
              '[&_[cmdk-group-heading]]:px-3',
              '[&_[cmdk-group-heading]]:py-1.5',
              '[&_[cmdk-group-heading]]:font-mono',
              '[&_[cmdk-group-heading]]:text-[10px]',
              '[&_[cmdk-group-heading]]:uppercase',
              '[&_[cmdk-group-heading]]:tracking-[0.25em]',
              '[&_[cmdk-group-heading]]:text-[var(--ink-dim)]',
            )}
          >
            {items.map((item) => (
              <Command.Item
                key={item.key}
                value={`${item.title} ${item.description}`}
                onSelect={() => {
                  navigate(item.route);
                  onOpenChange(false);
                }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 cursor-pointer',
                  'text-[var(--ink-2)] font-serif',
                  'data-[selected=true]:bg-[var(--surface-2)]',
                  'data-[selected=true]:text-[var(--ink)]',
                )}
              >
                {item.icon && <item.icon size={16} className="text-[var(--ink-dim)] shrink-0" />}
                <span className="flex-1 truncate">{item.title}</span>
                <span className="font-mono text-[10px] text-[var(--ink-dim-2)] truncate hidden sm:inline">
                  {item.route}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
