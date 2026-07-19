import React from 'react';
import { MessageSquare, Phone, UserPlus } from 'lucide-react';
import { Portrait } from '../../../components/Portrait';
import { LoadBar } from '../../../components/SkeletonComponents';
import { Chip } from '../../../components/ui/Chip';
import { Contact } from './types';

interface ContactsTabProps {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
}

const STATUS_TONE: Record<string, 'ok' | 'warn' | 'default'> = {
  online: 'ok',
  away: 'warn',
  busy: 'warn',
};

const iconButton =
  'inline-flex items-center justify-center h-8 w-8 rounded-[var(--radius-sm)] border border-[var(--rule)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-colors';

const ContactsTab: React.FC<ContactsTabProps> = ({ contacts, loading, error }) => {
  if (loading)
    return (
      <div className="max-w-xs">
        <LoadBar />
      </div>
    );
  if (error) return <div className="font-serif text-sm text-[var(--accent)]">{error}</div>;
  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <UserPlus size={32} className="text-[var(--ink-dim)]" />
        <p className="font-serif text-sm text-[var(--ink-2)]">Henüz kişi yok.</p>
      </div>
    );
  }

  return (
    <ul className="rounded-[var(--radius)] border border-[var(--rule)] divide-y divide-[var(--rule)] overflow-hidden">
      {contacts.map((contact) => (
        <li
          key={contact.id}
          className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors"
        >
          <Portrait name={contact.contactName} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="font-serif text-sm text-[var(--ink)] truncate">
              {contact.contactName}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[var(--ink-dim)]">{contact.contactRole}</span>
              <Chip tone={STATUS_TONE[contact.status] ?? 'default'}>{contact.status}</Chip>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" className={iconButton} aria-label="Mesaj gönder" title="Mesaj">
              <MessageSquare size={14} />
            </button>
            <button type="button" className={iconButton} aria-label="Ara" title="Ara">
              <Phone size={14} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default ContactsTab;
