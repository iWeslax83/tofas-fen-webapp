import { useState } from 'react';
import ModernDashboardLayout from '../../../components/ModernDashboardLayout';
import { cn } from '../../../utils/cn';
import BulkImportTab from './BulkImportTab';
import UsersTab from './UsersTab';
import AuditLogTab from './AuditLogTab';

type Tab = 'bulk' | 'users' | 'audit';

const TABS: { key: Tab; label: string }[] = [
  { key: 'bulk', label: 'Toplu İçe Aktar' },
  { key: 'users', label: 'Kullanıcılar' },
  { key: 'audit', label: 'Geçmiş' },
];

const breadcrumb = [{ label: 'Ana Sayfa', path: '/admin' }, { label: 'Şifre Yönetimi' }];

export default function PasswordManagementPage() {
  const [tab, setTab] = useState<Tab>('bulk');

  return (
    <ModernDashboardLayout pageTitle="Şifre Yönetimi" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header>
          <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Şifre Yönetimi</h1>
        </header>

        {/* Flat ministerial tab bar — no teal, no rounded corners */}
        <div role="tablist" className="flex border-b border-[var(--rule)]">
          {TABS.map(({ key, label }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(key)}
                className={cn(
                  'h-9 px-4 text-xs font-mono uppercase tracking-wider transition-colors',
                  'border-b-2 -mb-px',
                  active
                    ? 'border-[var(--state)] text-[var(--ink)]'
                    : 'border-transparent text-[var(--ink-dim)] hover:text-[var(--ink)]',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div role="tabpanel">
          {tab === 'bulk' && <BulkImportTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'audit' && <AuditLogTab />}
        </div>
      </div>
    </ModernDashboardLayout>
  );
}
