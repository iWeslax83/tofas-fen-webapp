import { useState } from 'react';
import BulkImportTab from './BulkImportTab';
import UsersTab from './UsersTab';
import AuditLogTab from './AuditLogTab';

type Tab = 'bulk' | 'users' | 'audit';

export default function PasswordManagementPage() {
  const [tab, setTab] = useState<Tab>('bulk');
  const tabClass = (t: Tab) =>
    `px-4 py-2 border-b-2 ${tab === t ? 'border-red-600 text-red-600 font-medium' : 'border-transparent text-gray-600 hover:text-gray-900'}`;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Şifre Yönetimi</h1>
      <div className="border-b mb-4">
        <button onClick={() => setTab('bulk')} className={tabClass('bulk')}>
          Toplu İçe Aktar
        </button>
        <button onClick={() => setTab('users')} className={tabClass('users')}>
          Kullanıcılar
        </button>
        <button onClick={() => setTab('audit')} className={tabClass('audit')}>
          Geçmiş
        </button>
      </div>
      {tab === 'bulk' && <BulkImportTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'audit' && <AuditLogTab />}
    </div>
  );
}
