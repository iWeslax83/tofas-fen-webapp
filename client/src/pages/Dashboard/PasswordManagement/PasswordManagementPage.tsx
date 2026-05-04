import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/Tabs';
import BulkImportTab from './BulkImportTab';
import UsersTab from './UsersTab';
import AuditLogTab from './AuditLogTab';

type Tab = 'bulk' | 'users' | 'audit';

export default function PasswordManagementPage() {
  const [tab, setTab] = useState<Tab>('bulk');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4 text-[var(--ink)]">Şifre Yönetimi</h1>
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList variant="underline">
          <TabsTrigger value="bulk">Toplu İçe Aktar</TabsTrigger>
          <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
          <TabsTrigger value="audit">Geçmiş</TabsTrigger>
        </TabsList>
        <TabsContent value="bulk">
          <BulkImportTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="audit">
          <AuditLogTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
