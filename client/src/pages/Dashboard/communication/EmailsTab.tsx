import React from 'react';
import { Mail } from 'lucide-react';
import { LoadBar } from '../../../components/SkeletonComponents';
import { Email } from './types';

interface EmailsTabProps {
  emails: Email[];
  loading: boolean;
  error: string | null;
  formatDate: (date: Date) => string;
}

const EmailsTab: React.FC<EmailsTabProps> = ({ emails, loading, error, formatDate }) => {
  if (loading)
    return (
      <div className="max-w-xs">
        <LoadBar />
      </div>
    );
  if (error) return <div className="font-serif text-sm text-[var(--accent)]">{error}</div>;
  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Mail size={32} className="text-[var(--ink-dim)]" />
        <p className="font-serif text-sm text-[var(--ink-2)]">Henüz e-posta yok.</p>
      </div>
    );
  }

  return (
    <ul className="rounded-[var(--radius)] border border-[var(--rule)] divide-y divide-[var(--rule)] overflow-hidden">
      {emails.map((email) => (
        <li
          key={email.id}
          className="flex items-start gap-4 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-sm text-[var(--ink)]">{email.from.name}</span>
              <span className="text-xs text-[var(--ink-dim)] shrink-0 ml-auto whitespace-nowrap">
                {formatDate(email.createdAt)}
              </span>
            </div>
            <div className="mt-0.5 text-sm font-semibold text-[var(--ink-2)] truncate">
              {email.subject}
            </div>
            <p className="mt-0.5 text-xs text-[var(--ink-dim)] truncate">
              {email.content.substring(0, 100)}…
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default EmailsTab;
